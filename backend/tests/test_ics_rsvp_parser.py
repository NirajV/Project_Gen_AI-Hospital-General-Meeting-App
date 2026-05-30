"""
Tests for the inbound iCalendar RSVP-REPLY parser.

The three real-world REPLY formats below were captured from:
    • Gmail (web UI · "Yes" button click on meeting-invite preview card)
    • Outlook 365 (web UI · Accept → "Don't send a response")
    • Apple Calendar (macOS Mail → "Accept" from invite)

Each is intentionally written verbatim so future parser tweaks don't silently
break compatibility.
"""
from __future__ import annotations

import email
import pytest

from utils.ics_rsvp_parser import parse_ics_reply, extract_ics_from_email


# ---------------------------------------------------------------------------
# Real-world reply fixtures
# ---------------------------------------------------------------------------

GMAIL_ACCEPTED = (
    "BEGIN:VCALENDAR\r\n"
    "PRODID:-//Google Inc//Google Calendar 70.9054//EN\r\n"
    "VERSION:2.0\r\n"
    "METHOD:REPLY\r\n"
    "BEGIN:VEVENT\r\n"
    "DTSTART:20260615T140000Z\r\n"
    "DTEND:20260615T150000Z\r\n"
    "DTSTAMP:20260601T103000Z\r\n"
    "ORGANIZER;CN=Demo BioMedMeet:mailto:demo@biomedmeet.com\r\n"
    "UID:abc-123-meeting-id@medmeet.hospital\r\n"
    "ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=Jane Doe;\r\n"
    " X-NUM-GUESTS=0:mailto:jane.doe@hospital.org\r\n"
    "X-MICROSOFT-CDO-OWNERAPPTID:-873\r\n"
    "SEQUENCE:0\r\n"
    "SUMMARY:Accepted: Tumour Board #3\r\n"
    "END:VEVENT\r\n"
    "END:VCALENDAR\r\n"
)

OUTLOOK_DECLINED = (
    "BEGIN:VCALENDAR\r\n"
    "METHOD:REPLY\r\n"
    "PRODID:Microsoft Exchange Server 2010\r\n"
    "VERSION:2.0\r\n"
    "BEGIN:VEVENT\r\n"
    "ORGANIZER;CN=\"Demo BioMedMeet\":mailto:demo@biomedmeet.com\r\n"
    "ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=DECLINED;CN=\"Smith, John, Dr.\":mailto:john.smith@partner-hosp.org\r\n"
    "DESCRIPTION;LANGUAGE=en-US:Declined the meeting.\r\n"
    "UID:def-456-meeting-id@medmeet.hospital\r\n"
    "SUMMARY;LANGUAGE=en-US:Declined: Weekly MDT\r\n"
    "DTSTART;TZID=Eastern Standard Time:20260616T090000\r\n"
    "DTEND;TZID=Eastern Standard Time:20260616T100000\r\n"
    "DTSTAMP:20260602T141500Z\r\n"
    "CLASS:PUBLIC\r\n"
    "PRIORITY:5\r\n"
    "SEQUENCE:0\r\n"
    "STATUS:CONFIRMED\r\n"
    "TRANSP:OPAQUE\r\n"
    "END:VEVENT\r\n"
    "END:VCALENDAR\r\n"
)

APPLE_TENTATIVE = (
    "BEGIN:VCALENDAR\n"
    "PRODID:-//Apple Inc.//Mac OS X 14.4.1//EN\n"
    "VERSION:2.0\n"
    "METHOD:REPLY\n"
    "BEGIN:VEVENT\n"
    "UID:xyz-789-meeting-id@medmeet.hospital\n"
    "DTSTAMP:20260603T180000Z\n"
    "ORGANIZER:mailto:demo@biomedmeet.com\n"
    "ATTENDEE;PARTSTAT=TENTATIVE;CN=Anjali Patel:mailto:apatel@hospital.in\n"
    "SUMMARY:Tentative: Pre-op review\n"
    "END:VEVENT\n"
    "END:VCALENDAR\n"
)


# ---------------------------------------------------------------------------
# Happy paths
# ---------------------------------------------------------------------------

class TestGmailReply:
    def test_extracts_meeting_id(self):
        r = parse_ics_reply(GMAIL_ACCEPTED)
        assert r is not None
        assert r["meeting_id"] == "abc-123-meeting-id"
        assert r["uid"] == "abc-123-meeting-id@medmeet.hospital"

    def test_response_status_accepted(self):
        r = parse_ics_reply(GMAIL_ACCEPTED)
        assert r["response_status"] == "accepted"
        assert r["raw_partstat"] == "ACCEPTED"

    def test_attendee_email_lowercased(self):
        r = parse_ics_reply(GMAIL_ACCEPTED)
        assert r["attendee_email"] == "jane.doe@hospital.org"

    def test_handles_line_folding(self):
        # Gmail wraps long ATTENDEE lines across two physical lines with
        # a leading space; parser MUST unfold them per RFC 5545 §3.1.
        r = parse_ics_reply(GMAIL_ACCEPTED)
        assert r is not None
        assert "x-num-guests=0" not in r["attendee_email"]


class TestOutlookReply:
    def test_declined_status(self):
        r = parse_ics_reply(OUTLOOK_DECLINED)
        assert r is not None
        assert r["response_status"] == "declined"
        assert r["meeting_id"] == "def-456-meeting-id"

    def test_strips_quoted_cn(self):
        # Outlook quotes CN values containing commas. We don't use CN for
        # routing, but the parser must not choke on it.
        r = parse_ics_reply(OUTLOOK_DECLINED)
        assert r["attendee_email"] == "john.smith@partner-hosp.org"


class TestAppleMailReply:
    def test_tentative_status_with_lf_only(self):
        # Some mail clients drop the CR. Parser must accept LF-only payloads.
        r = parse_ics_reply(APPLE_TENTATIVE)
        assert r is not None
        assert r["response_status"] == "tentative"
        assert r["meeting_id"] == "xyz-789-meeting-id"


# ---------------------------------------------------------------------------
# Negative / edge cases — must return None, NOT raise
# ---------------------------------------------------------------------------

class TestRejectsBadPayloads:
    def test_none_input(self):
        assert parse_ics_reply(None) is None

    def test_empty_input(self):
        assert parse_ics_reply("") is None

    def test_request_method_ignored(self):
        # A REQUEST is the outgoing invite, not an RSVP — parser must ignore.
        payload = GMAIL_ACCEPTED.replace("METHOD:REPLY", "METHOD:REQUEST")
        assert parse_ics_reply(payload) is None

    def test_missing_method_treated_as_non_reply(self):
        payload = GMAIL_ACCEPTED.replace("METHOD:REPLY\r\n", "")
        assert parse_ics_reply(payload) is None

    def test_missing_attendee(self):
        payload = (
            "BEGIN:VCALENDAR\r\n"
            "METHOD:REPLY\r\n"
            "BEGIN:VEVENT\r\n"
            "UID:nobody@medmeet.hospital\r\n"
            "END:VEVENT\r\n"
            "END:VCALENDAR\r\n"
        )
        assert parse_ics_reply(payload) is None

    def test_needs_action_partstat_ignored(self):
        # NEEDS-ACTION on a REPLY makes no sense — treat as unparseable so
        # we don't accidentally flip a participant back to pending.
        payload = GMAIL_ACCEPTED.replace("PARTSTAT=ACCEPTED", "PARTSTAT=NEEDS-ACTION")
        assert parse_ics_reply(payload) is None

    def test_unknown_partstat_ignored(self):
        payload = GMAIL_ACCEPTED.replace("PARTSTAT=ACCEPTED", "PARTSTAT=NEEDS-MAYBE")
        assert parse_ics_reply(payload) is None


# ---------------------------------------------------------------------------
# extract_ics_from_email — pulls calendar parts out of a real email envelope
# ---------------------------------------------------------------------------

def _build_email_with_ics(ics_text: str) -> str:
    """Construct a minimal RFC 5322 message carrying an .ics attachment."""
    return (
        "MIME-Version: 1.0\r\n"
        "From: jane@hospital.org\r\n"
        "To: demo@biomedmeet.com\r\n"
        "Subject: Accepted: Tumour Board #3\r\n"
        'Content-Type: multipart/alternative; boundary="b1"\r\n'
        "\r\n"
        "--b1\r\n"
        "Content-Type: text/plain; charset=UTF-8\r\n\r\n"
        "Yes, I will attend.\r\n"
        "--b1\r\n"
        'Content-Type: text/calendar; method=REPLY; charset=UTF-8\r\n'
        "\r\n"
        f"{ics_text}"
        "--b1--\r\n"
    )


class TestExtractFromEmail:
    def test_pulls_calendar_part(self):
        raw = _build_email_with_ics(GMAIL_ACCEPTED)
        msg = email.message_from_string(raw)
        parts = extract_ics_from_email(msg)
        assert len(parts) == 1
        result = parse_ics_reply(parts[0])
        assert result is not None
        assert result["response_status"] == "accepted"

    def test_no_calendar_part_returns_empty(self):
        raw = (
            "MIME-Version: 1.0\r\n"
            "From: a@x.com\r\n"
            "Subject: hi\r\n"
            "Content-Type: text/plain; charset=UTF-8\r\n\r\n"
            "just a regular email\r\n"
        )
        msg = email.message_from_string(raw)
        assert extract_ics_from_email(msg) == []


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
