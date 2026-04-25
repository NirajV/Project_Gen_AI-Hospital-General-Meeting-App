"""
Background email reminder scheduler for Hospital Meeting App.

Runs as an asyncio background task inside the FastAPI process (started in
server.py's startup event). Sends a single "1 hour before" email reminder
to each accepted participant of every scheduled meeting.

Configuration (env):
    EMAIL_REMINDERS_ENABLED   "true"/"false"  (default: "true")
    REMINDER_POLL_SECONDS     poll interval   (default: 300 seconds = 5 min)

Deduplication:
    A meeting is marked with `reminder_1h_sent: True` once its 1h reminders
    have been dispatched, so reminders are never sent twice for the same meeting.
"""

import asyncio
import logging
import os
from datetime import datetime, timedelta

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
        await db.meetings.update_one(
            {"id": meeting_id},
            {
                "$set": {
                    "reminder_1h_sent": True,
                    "reminder_1h_sent_at": datetime.utcnow().isoformat(),
                    "reminder_1h_sent_count": sent_count,
                }
            },
        )
        logger.info(
            "Marked meeting %s reminded (sent to %d participant(s))",
            meeting_id,
            sent_count,
        )


async def reminder_loop(db) -> None:
    """Long-running background loop. Started from server.py startup hook."""
    if not _is_enabled():
        logger.info("Email reminder scheduler disabled (EMAIL_REMINDERS_ENABLED=false)")
        return

    interval = _poll_interval()
    logger.info(
        "Email reminder scheduler started (1h reminders, poll every %ss)", interval
    )

    while True:
        try:
            await _send_one_hour_reminders(db)
        except asyncio.CancelledError:
            logger.info("Email reminder scheduler cancelled")
            raise
        except Exception as e:
            # Never let a single iteration error kill the loop.
            logger.exception("Reminder loop iteration failed: %s", e)

        try:
            await asyncio.sleep(interval)
        except asyncio.CancelledError:
            logger.info("Email reminder scheduler cancelled during sleep")
            raise
