"""
Timezone utilities — convert meeting datetime strings (stored in the
organizer's local time as separate `meeting_date` + `start_time` strings)
into properly formatted strings displayed in any given target timezone.

Used by:
- email invitations (reminder / invite) so each recipient sees the meeting
  time in *their* configured timezone
- frontend (via API) for the same purpose

Stored format on a meeting document:
    meeting_date: "2026-12-15"  (YYYY-MM-DD)
    start_time:   "09:00"       (HH:MM, 24h)
    end_time:     "10:00"
    organizer_timezone: "America/New_York"  (IANA, optional)

If `organizer_timezone` is missing we assume UTC (legacy behaviour).
"""

from datetime import datetime
from typing import Optional, Dict, Tuple
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
import logging

logger = logging.getLogger(__name__)

DEFAULT_TZ = "UTC"


def _safe_zone(tz_name: Optional[str]) -> ZoneInfo:
    if not tz_name:
        return ZoneInfo(DEFAULT_TZ)
    try:
        return ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        logger.warning("Unknown timezone %r, falling back to UTC", tz_name)
        return ZoneInfo(DEFAULT_TZ)


def parse_meeting_datetime(
    meeting_date: str,
    start_time: str,
    organizer_timezone: Optional[str] = None,
) -> Optional[datetime]:
    """Combine `meeting_date` + `start_time` into an aware datetime in the
    organizer's timezone. Returns None on parse failure."""
    if not meeting_date or not start_time:
        return None
    try:
        naive = datetime.strptime(f"{meeting_date} {start_time}", "%Y-%m-%d %H:%M")
    except ValueError:
        logger.warning(
            "Could not parse meeting datetime: %r %r", meeting_date, start_time
        )
        return None
    return naive.replace(tzinfo=_safe_zone(organizer_timezone))


def format_meeting_time_for_user(
    meeting: Dict,
    user_timezone: Optional[str] = None,
) -> Tuple[str, str]:
    """
    Format a meeting's date/time for display in `user_timezone`.

    Returns: (formatted_date, formatted_time_with_tz)
        formatted_date  -> "Tuesday, Dec 15, 2026"
        formatted_time  -> "09:00 EST"

    Falls back to the raw stored strings if anything goes wrong, so emails
    never break.
    """
    raw_date = meeting.get("meeting_date") or meeting.get("date") or "TBD"
    raw_time = meeting.get("start_time") or meeting.get("time") or "TBD"

    aware = parse_meeting_datetime(
        meeting.get("meeting_date") or meeting.get("date"),
        meeting.get("start_time") or meeting.get("time"),
        meeting.get("organizer_timezone"),
    )
    if aware is None:
        return raw_date, raw_time

    target = aware.astimezone(_safe_zone(user_timezone))
    formatted_date = target.strftime("%A, %b %d, %Y")
    # %Z gives the abbreviation (EST/IST/UTC). Some platforms return ""
    # for non-pytz zones; fall back to the IANA name in that case.
    abbr = target.strftime("%Z") or (user_timezone or DEFAULT_TZ)
    formatted_time = target.strftime("%H:%M") + f" {abbr}"
    return formatted_date, formatted_time
