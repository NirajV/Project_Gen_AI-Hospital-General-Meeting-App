"""
Background scheduler for Hospital Meeting App.

Runs as an asyncio background task inside the FastAPI process (started in
server.py's startup event). Handles:
  1. Sends a single "1 hour before" email reminder to each accepted
     participant of every scheduled meeting.
  2. Auto-marks meetings as `completed` once `AUTO_COMPLETE_GRACE_MINUTES`
     has elapsed past their scheduled end time, so the UI stays accurate
     even when participants forget to click the Complete button at the end
     of the Teams call.

Configuration (env vars — set in backend/.env):
    EMAIL_REMINDERS_ENABLED         "true"/"false"  default: "true"
    AUTO_COMPLETE_ENABLED           "true"/"false"  default: "true"
    REMINDER_POLL_SECONDS           int seconds     default: 300  (5 minutes)
    AUTO_COMPLETE_GRACE_MINUTES     int minutes     default: 120  (2 hours)

Deduplication:
    - A meeting is flagged with `reminder_1h_sent: True` after its 1h
      reminders dispatch, so we never re-send.
    - Auto-complete only targets `scheduled` / `in_progress` meetings,
      so each meeting is flipped to `completed` at most once.
"""

import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

from utils.email import send_meeting_reminder

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Tunable defaults — overridable via environment variables
# ---------------------------------------------------------------------------

# 1-hour-reminder window: meetings starting between (now + WINDOW_LOWER_MIN)
# and (now + WINDOW_UPPER_MIN) are eligible. Window is wider than the poll
# interval so we never miss a meeting if a poll is briefly delayed.
WINDOW_LOWER_MIN = 50
WINDOW_UPPER_MIN = 70

DEFAULT_POLL_SECONDS = 300
DEFAULT_AUTO_COMPLETE_GRACE_MIN = 120


# ---------------------------------------------------------------------------
# Env helpers
# ---------------------------------------------------------------------------

def _env_bool(name: str, default: bool = True) -> bool:
    return os.environ.get(name, "true" if default else "false").lower() == "true"


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, str(default)))
    except ValueError:
        return default


def _reminders_enabled() -> bool:
    return _env_bool("EMAIL_REMINDERS_ENABLED", default=True)


def _auto_complete_enabled() -> bool:
    return _env_bool("AUTO_COMPLETE_ENABLED", default=True)


def _poll_interval() -> int:
    return _env_int("REMINDER_POLL_SECONDS", DEFAULT_POLL_SECONDS)


def _auto_complete_grace_minutes() -> int:
    return _env_int("AUTO_COMPLETE_GRACE_MINUTES", DEFAULT_AUTO_COMPLETE_GRACE_MIN)


def _frontend_url() -> str:
    return os.environ.get("FRONTEND_URL") or os.environ.get(
        "REACT_APP_BACKEND_URL", "http://localhost:3000"
    ).replace(":8001", ":3000")


# ---------------------------------------------------------------------------
# 1-hour reminder dispatch
# ---------------------------------------------------------------------------

def _parse_meeting_start(meeting: dict, today: str) -> Optional[datetime]:
    """Build a naive local datetime from `today` + meeting.start_time, or None."""
    start_time_str = meeting.get("start_time")
    if not start_time_str:
        return None
    try:
        return datetime.strptime(f"{today} {start_time_str}", "%Y-%m-%d %H:%M")
    except ValueError:
        logger.warning(
            "Skipping meeting %s: invalid start_time %r",
            meeting.get("id"), start_time_str,
        )
        return None


async def _send_reminder_to_participants(db, meeting: dict) -> int:
    """Email accepted participants for `meeting`. Returns count of sent emails."""
    meeting_id = meeting["id"]
    participant_docs = await db.meeting_participants.find(
        {"meeting_id": meeting_id, "response_status": "accepted"},
        {"_id": 0},
    ).to_list(500)

    meeting_payload = {
        "id": meeting_id,
        "title": meeting.get("title", "Meeting"),
        "date": meeting.get("meeting_date", "TBD"),
        "time": meeting.get("start_time", "TBD"),
        "location": meeting.get("location", "To be announced"),
    }

    sent = 0
    for pdoc in participant_docs:
        user = await db.users.find_one({"id": pdoc["user_id"]}, {"_id": 0})
        if not user or not user.get("email"):
            continue
        try:
            send_meeting_reminder(
                meeting=meeting_payload,
                participant=user,
                reminder_type="1h",
                frontend_url=_frontend_url(),
            )
            sent += 1
        except Exception as e:
            logger.error(
                "Failed to send 1h reminder to %s for meeting %s: %s",
                user.get("email"), meeting_id, e,
            )
    return sent


async def _mark_meeting_reminded(db, meeting_id: str, sent_count: int) -> None:
    """Persist reminder dispatch so we never re-send for this meeting."""
    await db.meetings.update_one(
        {"id": meeting_id},
        {"$set": {
            "reminder_1h_sent": True,
            "reminder_1h_sent_at": datetime.now().isoformat(),
            "reminder_1h_sent_count": sent_count,
        }},
    )


async def _send_one_hour_reminders(db) -> None:
    """Find scheduled meetings starting in ~1 hour and email accepted participants."""
    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    lower = now + timedelta(minutes=WINDOW_LOWER_MIN)
    upper = now + timedelta(minutes=WINDOW_UPPER_MIN)

    cursor = db.meetings.find(
        {
            "meeting_date": today,
            "status": "scheduled",
            "reminder_1h_sent": {"$ne": True},
        },
        {"_id": 0},
    )

    for meeting in await cursor.to_list(1000):
        meeting_start = _parse_meeting_start(meeting, today)
        if meeting_start is None or not (lower <= meeting_start <= upper):
            continue

        meeting_id = meeting["id"]
        logger.info(
            "Dispatching 1h reminder for meeting %s starting at %s",
            meeting_id, meeting_start.isoformat(),
        )
        sent_count = await _send_reminder_to_participants(db, meeting)
        await _mark_meeting_reminded(db, meeting_id, sent_count)
        logger.info(
            "Marked meeting %s reminded (sent to %d participant(s))",
            meeting_id, sent_count,
        )


# ---------------------------------------------------------------------------
# Auto-complete past meetings
# ---------------------------------------------------------------------------

async def _organizer_timezone(db, organizer_id: Optional[str]) -> ZoneInfo:
    """Resolve organizer's timezone with a UTC fallback."""
    tz_name = "UTC"
    if organizer_id:
        organizer = await db.users.find_one(
            {"id": organizer_id}, {"_id": 0, "timezone": 1}
        )
        if organizer and organizer.get("timezone"):
            tz_name = organizer["timezone"]
    try:
        return ZoneInfo(tz_name)
    except Exception:
        return ZoneInfo("UTC")


def _meeting_end_utc(
    meeting: dict, tz: ZoneInfo
) -> Optional[datetime]:
    """Return the meeting's scheduled end time in UTC, or None if unparseable."""
    meeting_date = meeting.get("meeting_date")
    end_time = meeting.get("end_time") or meeting.get("start_time")
    if not meeting_date or not end_time:
        return None
    try:
        end_dt_local = datetime.strptime(
            f"{meeting_date} {end_time[:5]}", "%Y-%m-%d %H:%M"
        ).replace(tzinfo=tz)
    except ValueError:
        logger.warning(
            "auto-complete: skip meeting %s — bad date/time (%s %s)",
            meeting.get("id"), meeting_date, end_time,
        )
        return None
    return end_dt_local.astimezone(timezone.utc)


async def _flip_meeting_complete(db, meeting_id: str, now_utc: datetime, grace_min: int) -> None:
    """Idempotently flip the meeting to `completed`."""
    await db.meetings.update_one(
        {"id": meeting_id, "status": {"$in": ["scheduled", "in_progress"]}},
        {"$set": {
            "status": "completed",
            "completed_at": now_utc.isoformat(),
            "auto_completed": True,
            "auto_completed_reason": f"Scheduled end + {grace_min} min grace elapsed",
        }},
    )


async def _auto_complete_ended_meetings(db) -> None:
    """
    Flip meetings to `completed` once their scheduled end time + grace period
    has passed. Uses the organizer's timezone (same TZ logic as the create /
    reschedule flows). Works for Teams and non-Teams meetings alike.
    """
    if not _auto_complete_enabled():
        return

    grace_min = _auto_complete_grace_minutes()
    now_utc = datetime.now(timezone.utc)

    cursor = db.meetings.find(
        {"status": {"$in": ["scheduled", "in_progress"]}},
        {"_id": 0},
    )

    for meeting in await cursor.to_list(1000):
        tz = await _organizer_timezone(db, meeting.get("organizer_id"))
        end_dt_utc = _meeting_end_utc(meeting, tz)
        if end_dt_utc is None:
            continue
        if now_utc < end_dt_utc + timedelta(minutes=grace_min):
            continue  # still inside the grace window

        meeting_id = meeting["id"]
        await _flip_meeting_complete(db, meeting_id, now_utc, grace_min)
        logger.info(
            "Auto-completed meeting %s (end=%s UTC, grace=%dmin)",
            meeting_id, end_dt_utc.isoformat(), grace_min,
        )


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

async def reminder_loop(db) -> None:
    """Long-running background loop. Started from server.py startup hook."""
    reminders_on = _reminders_enabled()
    auto_complete_on = _auto_complete_enabled()

    if not reminders_on and not auto_complete_on:
        logger.info(
            "Scheduler disabled (EMAIL_REMINDERS_ENABLED=false and AUTO_COMPLETE_ENABLED=false)"
        )
        return

    interval = _poll_interval()
    grace = _auto_complete_grace_minutes()
    logger.info(
        "Scheduler started — reminders=%s, auto_complete=%s, poll=%ss, grace=%dmin",
        reminders_on, auto_complete_on, interval, grace,
    )

    while True:
        try:
            if reminders_on:
                await _send_one_hour_reminders(db)
            if auto_complete_on:
                await _auto_complete_ended_meetings(db)
        except asyncio.CancelledError:
            logger.info("Scheduler cancelled")
            raise
        except Exception as e:
            logger.exception("Scheduler iteration failed: %s", e)

        try:
            await asyncio.sleep(interval)
        except asyncio.CancelledError:
            logger.info("Scheduler cancelled during sleep")
            raise
