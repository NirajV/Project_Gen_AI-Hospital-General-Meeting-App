"""
Background scheduler for Hospital Meeting App.

Runs as an asyncio background task inside the FastAPI process (started in
server.py's startup event). Handles:
  1. Sends a single "1 hour before" email reminder to each accepted
     participant of every scheduled meeting.
  2. Auto-marks meetings as `completed` 10 minutes after their scheduled
     end time, so the UI stays accurate even when participants forget to
     click the Complete button at the end of the Teams call.

Configuration (env):
    EMAIL_REMINDERS_ENABLED     "true"/"false"  (default: "true")
    AUTO_COMPLETE_ENABLED       "true"/"false"  (default: "true")
    REMINDER_POLL_SECONDS       poll interval   (default: 300 seconds = 5 min)
    AUTO_COMPLETE_GRACE_MINUTES grace period    (default: 10 minutes after end)

Deduplication:
    - A meeting is marked with `reminder_1h_sent: True` once its 1h reminders
      have been dispatched.
    - Auto-complete only targets meetings with status in {scheduled, in_progress},
      so each meeting is flipped to `completed` at most once.
"""

import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from utils.email import send_meeting_reminder

logger = logging.getLogger(__name__)

# Window: meetings starting between (now + WINDOW_LOWER) and (now + WINDOW_UPPER)
# get a 1-hour reminder. Window is wider than the poll interval so we never
# miss a meeting if a poll is briefly delayed.
WINDOW_LOWER_MIN = 50   # 50 minutes from now
WINDOW_UPPER_MIN = 70   # 70 minutes from now


def _is_enabled() -> bool:
    return os.environ.get("EMAIL_REMINDERS_ENABLED", "true").lower() == "true"


def _poll_interval() -> int:
    try:
        return int(os.environ.get("REMINDER_POLL_SECONDS", "300"))
    except ValueError:
        return 300


def _frontend_url() -> str:
    return os.environ.get("FRONTEND_URL") or os.environ.get(
        "REACT_APP_BACKEND_URL", "http://localhost:3000"
    ).replace(":8001", ":3000")


async def _send_one_hour_reminders(db) -> None:
    """Find scheduled meetings starting in ~1 hour and email accepted participants."""
    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    lower = now + timedelta(minutes=WINDOW_LOWER_MIN)
    upper = now + timedelta(minutes=WINDOW_UPPER_MIN)

    # Pull today's scheduled meetings that haven't been reminded yet.
    cursor = db.meetings.find(
        {
            "meeting_date": today,
            "status": "scheduled",
            "reminder_1h_sent": {"$ne": True},
        },
        {"_id": 0},
    )

    for meeting in await cursor.to_list(1000):
        start_time_str = meeting.get("start_time")
        if not start_time_str:
            continue

        # Parse start as today's datetime in local time (same TZ as `now`).
        try:
            meeting_start = datetime.strptime(
                f"{today} {start_time_str}", "%Y-%m-%d %H:%M"
            )
        except ValueError:
            logger.warning(
                "Skipping meeting %s: invalid start_time %r",
                meeting.get("id"),
                start_time_str,
            )
            continue

        if not (lower <= meeting_start <= upper):
            continue

        meeting_id = meeting["id"]
        logger.info(
            "Dispatching 1h reminder for meeting %s starting at %s",
            meeting_id,
            meeting_start.isoformat(),
        )

        # Find accepted participants
        participant_docs = await db.meeting_participants.find(
            {"meeting_id": meeting_id, "response_status": "accepted"},
            {"_id": 0},
        ).to_list(500)

        sent_count = 0
        for pdoc in participant_docs:
            user = await db.users.find_one(
                {"id": pdoc["user_id"]}, {"_id": 0}
            )
            if not user or not user.get("email"):
                continue

            meeting_payload = {
                "id": meeting_id,
                "title": meeting.get("title", "Meeting"),
                "date": meeting.get("meeting_date", "TBD"),
                "time": meeting.get("start_time", "TBD"),
                "location": meeting.get("location", "To be announced"),
            }
            try:
                send_meeting_reminder(
                    meeting=meeting_payload,
                    participant=user,
                    reminder_type="1h",
                    frontend_url=_frontend_url(),
                )
                sent_count += 1
            except Exception as e:
                logger.error(
                    "Failed to send 1h reminder to %s for meeting %s: %s",
                    user.get("email"),
                    meeting_id,
                    e,
                )

        # Mark the meeting so we never remind again, even if no recipients.
        # Using local-time isoformat to stay consistent with meeting_date/start_time
        # which are stored as user-local naive strings.
        await db.meetings.update_one(
            {"id": meeting_id},
            {
                "$set": {
                    "reminder_1h_sent": True,
                    "reminder_1h_sent_at": datetime.now().isoformat(),
                    "reminder_1h_sent_count": sent_count,
                }
            },
        )
        logger.info(
            "Marked meeting %s reminded (sent to %d participant(s))",
            meeting_id,
            sent_count,
        )


async def _auto_complete_ended_meetings(db) -> None:
    """
    Flip meetings to `completed` once their scheduled end time + grace period
    has passed. Uses the organizer's timezone (same TZ logic as the create /
    reschedule flows). Works for Teams and non-Teams meetings alike.
    """
    if os.environ.get("AUTO_COMPLETE_ENABLED", "true").lower() != "true":
        return

    try:
        grace_min = int(os.environ.get("AUTO_COMPLETE_GRACE_MINUTES", "10"))
    except ValueError:
        grace_min = 10

    now_utc = datetime.now(timezone.utc)

    # Only look at meetings that *could* still need auto-completing.
    cursor = db.meetings.find(
        {"status": {"$in": ["scheduled", "in_progress"]}},
        {"_id": 0},
    )

    for meeting in await cursor.to_list(1000):
        meeting_date = meeting.get("meeting_date")
        end_time = meeting.get("end_time") or meeting.get("start_time")
        if not meeting_date or not end_time:
            continue

        # Resolve organizer's timezone (fallback: UTC).
        organizer_tz_name = "UTC"
        organizer = await db.users.find_one(
            {"id": meeting.get("organizer_id")}, {"_id": 0, "timezone": 1}
        )
        if organizer and organizer.get("timezone"):
            organizer_tz_name = organizer["timezone"]
        try:
            tz = ZoneInfo(organizer_tz_name)
        except Exception:
            tz = ZoneInfo("UTC")

        try:
            end_dt_local = datetime.strptime(
                f"{meeting_date} {end_time[:5]}", "%Y-%m-%d %H:%M"
            ).replace(tzinfo=tz)
        except ValueError:
            logger.warning(
                "auto-complete: skip meeting %s — bad date/time (%s %s)",
                meeting.get("id"), meeting_date, end_time,
            )
            continue

        end_dt_utc = end_dt_local.astimezone(timezone.utc)
        if now_utc < end_dt_utc + timedelta(minutes=grace_min):
            continue  # not yet past the grace window

        meeting_id = meeting["id"]
        await db.meetings.update_one(
            {"id": meeting_id, "status": {"$in": ["scheduled", "in_progress"]}},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": now_utc.isoformat(),
                    "auto_completed": True,
                    "auto_completed_reason": f"Scheduled end + {grace_min} min grace elapsed",
                }
            },
        )
        logger.info(
            "Auto-completed meeting %s (end=%s local, grace=%dmin)",
            meeting_id, end_dt_local.isoformat(), grace_min,
        )


async def reminder_loop(db) -> None:
    """Long-running background loop. Started from server.py startup hook."""
    reminders_on = _is_enabled()
    auto_complete_on = os.environ.get("AUTO_COMPLETE_ENABLED", "true").lower() == "true"

    if not reminders_on and not auto_complete_on:
        logger.info("Scheduler disabled (EMAIL_REMINDERS_ENABLED=false and AUTO_COMPLETE_ENABLED=false)")
        return

    interval = _poll_interval()
    logger.info(
        "Scheduler started — reminders=%s, auto_complete=%s, poll=%ss",
        reminders_on, auto_complete_on, interval,
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
            # Never let a single iteration error kill the loop.
            logger.exception("Scheduler iteration failed: %s", e)

        try:
            await asyncio.sleep(interval)
        except asyncio.CancelledError:
            logger.info("Scheduler cancelled during sleep")
            raise
