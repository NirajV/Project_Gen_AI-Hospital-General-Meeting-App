"""
Parse inbound iCalendar (RFC 5545) REPLY messages to extract an attendee's
RSVP response. Used by the IMAP RSVP poller to translate Gmail/Outlook/Apple
Mail "Yes/No/Maybe" clicks back into BioMedMeet's `meeting_participants`.

This module is intentionally pure — no I/O, no network calls — so the parsing
logic can be unit-tested with sample payloads from real mail clients.

Reference: https://datatracker.ietf.org/doc/html/rfc5545#section-3.6.1
            https://datatracker.ietf.org/doc/html/rfc5546#section-3.2.3
"""
from __future__ import annotations

import logging
import re
from typing import Optional, Dict, List
from email.message import Message

logger = logging.getLogger(__name__)


# RFC 5545 PARTSTAT → BioMedMeet response_status. NEEDS-ACTION shouldn't appear
# in a REPLY (the attendee always commits to *something*), but we map it for
# completeness so a malformed reply doesn't crash the poller.
_PARTSTAT_TO_STATUS = {
    "ACCEPTED": "accepted",
    "TENTATIVE": "tentative",
    "DECLINED": "declined",
    "DELEGATED": "tentative",  # treat delegation as tentative; org needs to action
    "NEEDS-ACTION": "pending",
    "COMPLETED": "accepted",
    "IN-PROCESS": "tentative",
}


def _unfold(raw: str) -> List[str]:
    """RFC 5545 §3.1 line unfolding — a leading space/tab continues the prior line."""
    out: List[str] = []
    for line in raw.replace("\r\n", "\n").split("\n"):
        if line.startswith((" ", "\t")) and out:
            out[-1] += line[1:]
        else:
            out.append(line)
    return out


def _parse_property(line: str) -> Optional[Dict[str, object]]:
    """
    Parse a single iCalendar property line into:
        {name: 'ATTENDEE', params: {CN: 'Jane', PARTSTAT: 'ACCEPTED'}, value: 'mailto:jane@x.com'}

    Returns None for blank lines or BEGIN/END markers (handled separately).
    """
    if not line or ":" not in line:
        return None
    name_and_params, value = line.split(":", 1)
    bits = name_and_params.split(";")
    name = bits[0].strip().upper()
    params: Dict[str, str] = {}
    for raw in bits[1:]:
        if "=" not in raw:
            continue
        k, v = raw.split("=", 1)
        params[k.strip().upper()] = v.strip().strip('"')
    return {"name": name, "params": params, "value": value.strip()}


def _extract_email(mailto_value: str) -> Optional[str]:
    """Pull `jane@x.com` from `mailto:jane@x.com` (case-insensitive)."""
    if not mailto_value:
        return None
    m = re.match(r"\s*mailto:\s*(.+?)\s*$", mailto_value, re.IGNORECASE)
    return (m.group(1).strip().lower() if m else mailto_value.strip().lower()) or None


def _meeting_id_from_uid(uid: str) -> Optional[str]:
    """
    Builder embeds `{meeting_id}@medmeet.hospital`. We accept either form
    (with or without the @-suffix) so the parser tolerates UID rewrites
    that some mail relays perform.
    """
    if not uid:
        return None
    uid = uid.strip()
    return uid.split("@", 1)[0] if "@" in uid else uid


def parse_ics_reply(ics_text: str) -> Optional[Dict]:
    """
    Parse an iCalendar REPLY into a single response dict, or None when the
    payload isn't a usable REPLY.

    Returns:
        {
          "meeting_id":   "...",     # without @medmeet.hospital suffix
          "uid":          "...@medmeet.hospital",
          "attendee_email": "jane@x.com",
          "response_status":  "accepted" | "declined" | "tentative" | "pending",
          "dtstamp":      "20260615T103000Z" | None,
          "raw_partstat": "ACCEPTED",
        }
    """
    if not ics_text or not isinstance(ics_text, str):
        return None

    lines = _unfold(ics_text)
    in_vevent = False
    method: Optional[str] = None
    uid: Optional[str] = None
    dtstamp: Optional[str] = None
    attendee_email: Optional[str] = None
    partstat: Optional[str] = None

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue
        upper = line.upper()
        if upper == "BEGIN:VEVENT":
            in_vevent = True
            continue
        if upper == "END:VEVENT":
            in_vevent = False
            continue

        prop = _parse_property(line)
        if not prop:
            continue
        pname = prop["name"]

        if pname == "METHOD":
            method = (prop["value"] or "").upper()
            continue

        # Only consider properties inside the VEVENT for UID/ATTENDEE matching.
        if not in_vevent:
            continue

        if pname == "UID":
            uid = prop["value"]
        elif pname == "DTSTAMP":
            dtstamp = prop["value"]
        elif pname == "ATTENDEE":
            # First ATTENDEE wins — REPLY messages by spec carry exactly one.
            if attendee_email is None:
                attendee_email = _extract_email(prop["value"])
                partstat = (prop["params"].get("PARTSTAT") or "").upper() or None

    if method != "REPLY":
        return None
    if not uid or not attendee_email or not partstat:
        return None

    status = _PARTSTAT_TO_STATUS.get(partstat)
    if not status or status == "pending":
        # PARTSTAT we don't have a real mapping for → can't act on this reply.
        return None

    return {
        "meeting_id": _meeting_id_from_uid(uid),
        "uid": uid,
        "attendee_email": attendee_email,
        "response_status": status,
        "dtstamp": dtstamp,
        "raw_partstat": partstat,
    }


def extract_ics_from_email(msg: Message) -> List[str]:
    """
    Pull every `text/calendar` part out of a parsed email.Message.
    Returns the decoded text bodies (may be empty list). The poller hands the
    bodies to `parse_ics_reply` one by one.
    """
    out: List[str] = []
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/calendar":
                out.extend(_decode_payload(part))
    else:
        if msg.get_content_type() == "text/calendar":
            out.extend(_decode_payload(msg))
    return out


def _decode_payload(part: Message) -> List[str]:
    payload = part.get_payload(decode=True)
    if not payload:
        return []
    charset = part.get_content_charset() or "utf-8"
    try:
        return [payload.decode(charset, errors="replace")]
    except (LookupError, UnicodeDecodeError):
        return [payload.decode("utf-8", errors="replace")]
