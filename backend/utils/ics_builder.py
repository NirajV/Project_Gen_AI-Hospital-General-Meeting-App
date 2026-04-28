"""
Generate RFC 5545 iCalendar (.ics) files for meeting invitations.

Producing an .ics attachment on invite emails lets every calendar app
(Outlook, Gmail, Apple Calendar) add the event to the recipient's
calendar in their local timezone automatically — with recurrence when
applicable — without needing per-provider OAuth integration.
"""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from typing import Optional, Dict
import logging
import uuid

logger = logging.getLogger(__name__)


def _safe_zone(tz_name: Optional[str]) -> ZoneInfo:
    try:
        return ZoneInfo(tz_name or "UTC")
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


def _fmt_utc(dt: datetime) -> str:
    """Format datetime as iCalendar UTC stamp: 20261215T140000Z."""
    return dt.astimezone(ZoneInfo("UTC")).strftime("%Y%m%dT%H%M%SZ")


def _fmt_local(dt: datetime) -> str:
    """Format as local (floating) time: 20261215T090000."""
    return dt.strftime("%Y%m%dT%H%M%S")


def _recurrence_rule(recurrence_type: Optional[str]) -> Optional[str]:
    """Convert our recurrence_type string to an RFC 5545 RRULE."""
    if not recurrence_type or recurrence_type in ("none", "one_time"):
        return None
    mapping = {
        "daily": "FREQ=DAILY",
        "weekly": "FREQ=WEEKLY",
        "bi_weekly": "FREQ=WEEKLY;INTERVAL=2",
        "biweekly": "FREQ=WEEKLY;INTERVAL=2",
        "monthly": "FREQ=MONTHLY",
        "quarterly": "FREQ=MONTHLY;INTERVAL=3",
        "yearly": "FREQ=YEARLY",
        "annually": "FREQ=YEARLY",
    }
    return mapping.get(recurrence_type.lower().replace("-", "_"))


def _escape(text: Optional[str]) -> str:
    if not text:
        return ""
    return (
        str(text)
        .replace("\\", "\\\\")
        .replace("\n", "\\n")
        .replace(",", "\\,")
        .replace(";", "\\;")
    )


def build_meeting_ics(
    meeting: Dict,
    organizer_email: str,
    organizer_name: str,
    participant_email: Optional[str] = None,
    participant_name: Optional[str] = None,
) -> str:
    """
    Build an iCalendar document for a single meeting.

    `meeting` should contain:
        id, title, description, location, meeting_date ('YYYY-MM-DD'),
        start_time ('HH:MM'), end_time ('HH:MM'),
        organizer_timezone (IANA, optional),
        teams_join_url or video_link (optional),
        recurrence_type (optional: daily/weekly/bi_weekly/monthly/quarterly/yearly).
    """
    tz_name = meeting.get("organizer_timezone") or "UTC"
    tz = _safe_zone(tz_name)

    try:
        start_local = datetime.strptime(
            f"{meeting['meeting_date']} {meeting['start_time']}", "%Y-%m-%d %H:%M"
        ).replace(tzinfo=tz)
        end_local = datetime.strptime(
            f"{meeting['meeting_date']} {meeting['end_time']}", "%Y-%m-%d %H:%M"
        ).replace(tzinfo=tz)
    except (KeyError, ValueError):
        # Fallback: 1-hour meeting starting now
        start_local = datetime.now(tz)
        end_local = start_local + timedelta(hours=1)

    # Build description with join link prominently.
    parts = []
    if meeting.get("description"):
        parts.append(_escape(meeting["description"]))
    join_url = meeting.get("teams_join_url") or meeting.get("video_link")
    if join_url:
        parts.append(f"Join the meeting: {join_url}")
    description = "\\n\\n".join(parts) if parts else ""

    location = meeting.get("location") or ""
    # Teams meetings are often online-only — use the join URL as the location
    # when no physical location is set, so calendar apps show a click-to-join.
    if not location and join_url:
        location = join_url

    uid = f"{meeting.get('id', uuid.uuid4().hex)}@medmeet.hospital"

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//MedMeet//Hospital Meeting Scheduler//EN",
        "METHOD:REQUEST",
        "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{_fmt_utc(datetime.now(tz))}",
        f"DTSTART;TZID={tz_name}:{_fmt_local(start_local)}",
        f"DTEND;TZID={tz_name}:{_fmt_local(end_local)}",
        f"SUMMARY:{_escape(meeting.get('title', 'Hospital Meeting'))}",
    ]
    if description:
        lines.append(f"DESCRIPTION:{description}")
    if location:
        lines.append(f"LOCATION:{_escape(location)}")
    if join_url:
        lines.append(f"URL:{join_url}")
        # Outlook-specific hints so it highlights the online meeting
        lines.append(f"X-MICROSOFT-SKYPETEAMSMEETINGURL:{join_url}")

    rrule = _recurrence_rule(meeting.get("recurrence_type"))
    if rrule:
        lines.append(f"RRULE:{rrule}")

    lines.append(
        f"ORGANIZER;CN={_escape(organizer_name)}:mailto:{organizer_email}"
    )
    if participant_email:
        lines.append(
            f"ATTENDEE;CN={_escape(participant_name or participant_email)};"
            "ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:"
            f"mailto:{participant_email}"
        )

    lines.extend([
        "STATUS:CONFIRMED",
        "SEQUENCE:0",
        "TRANSP:OPAQUE",
        "END:VEVENT",
        "END:VCALENDAR",
    ])

    # RFC 5545 requires CRLF line endings.
    return "\r\n".join(lines) + "\r\n"
