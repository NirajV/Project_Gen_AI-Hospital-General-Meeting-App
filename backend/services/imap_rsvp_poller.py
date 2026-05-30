"""
IMAP-based RSVP poller.

Periodically logs into the `demo@biomedmeet.com` mailbox over IMAP, looks for
unprocessed iCalendar REPLY messages (the bounce-back you get when a Gmail
recipient clicks "Yes" / "No" / "Maybe" on the auto-rendered calendar card),
and updates `meeting_participants.response_status` accordingly.

Idempotency:
    A new Mongo collection `processed_rsvp_emails` records every IMAP UID we've
    already actioned, so a re-poll never double-applies. The poller also marks
    the message `\\Seen` on the IMAP server, but Mongo is the source of truth.

Failure modes:
    - IMAP unreachable / auth bad → log and skip the cycle (next iteration tries again).
    - Malformed .ics → parser returns None, message skipped (still marked processed).
    - UID doesn't match any meeting → logged as a warning, message marked processed.

Configuration via env vars (all override-able in `backend/.env`):
    RSVP_POLL_ENABLED         "true"/"false"     default: "false" (opt-in)
    RSVP_POLL_SECONDS         int                default: 300
    IMAP_HOST                 string             default: "imap.gmail.com"
    IMAP_PORT                 int                default: 993
    IMAP_USER                 string             (required when enabled)
    IMAP_PASSWORD             string             (required when enabled)
    IMAP_MAILBOX              string             default: "INBOX"
"""
from __future__ import annotations

import email
import imaplib
import logging
import os
from datetime import datetime, timezone
from typing import Optional, Tuple

from utils.ics_rsvp_parser import parse_ics_reply, extract_ics_from_email

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Env helpers
# ---------------------------------------------------------------------------

def _env_bool(name: str, default: bool = False) -> bool:
    return os.environ.get(name, "true" if default else "false").lower() == "true"


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, str(default)))
    except ValueError:
        return default


def rsvp_poll_enabled() -> bool:
    return _env_bool("RSVP_POLL_ENABLED", default=False)


def rsvp_poll_seconds() -> int:
    return _env_int("RSVP_POLL_SECONDS", 300)


def _imap_config() -> Optional[dict]:
    """Validate & assemble IMAP config. Returns None when not configured."""
    user = os.environ.get("IMAP_USER") or os.environ.get("SMTP_USER")
    password = os.environ.get("IMAP_PASSWORD") or os.environ.get("SMTP_PASSWORD")
    if not user or not password:
        return None
    return {
        "host": os.environ.get("IMAP_HOST", "imap.gmail.com"),
        "port": _env_int("IMAP_PORT", 993),
        "user": user,
        # Gmail app passwords may be displayed with spaces — strip them
        # so the IMAP login succeeds.
        "password": password.replace(" ", ""),
        "mailbox": os.environ.get("IMAP_MAILBOX", "INBOX"),
    }


# ---------------------------------------------------------------------------
# IMAP fetch
# ---------------------------------------------------------------------------

def _connect_and_search(cfg: dict) -> Tuple[Optional[imaplib.IMAP4_SSL], list]:
    """
    Open the mailbox and return the list of message UIDs to process.

    We use IMAP UIDs (not sequence numbers) because they survive mailbox
    reordering, and we restrict to UNSEEN messages so already-processed
    replies aren't re-fetched.
    """
    try:
        conn = imaplib.IMAP4_SSL(cfg["host"], cfg["port"])
        conn.login(cfg["user"], cfg["password"])
    except Exception as e:
        logger.error("RSVP poller: IMAP login failed (%s): %s", cfg["host"], e)
        return None, []

    try:
        status, _ = conn.select(cfg["mailbox"])
        if status != "OK":
            logger.error("RSVP poller: cannot SELECT %s", cfg["mailbox"])
            conn.logout()
            return None, []
        # UNSEEN AND has a text/calendar part. Plain UNSEEN is more reliable
        # than HEADER searches across providers — we filter to text/calendar
        # afterwards in Python.
        status, data = conn.uid("SEARCH", None, "UNSEEN")
        if status != "OK":
            logger.error("RSVP poller: SEARCH failed: %s", data)
            conn.logout()
            return None, []
        uids = data[0].split() if data and data[0] else []
        return conn, uids
    except Exception as e:
        logger.error("RSVP poller: unexpected error during SELECT/SEARCH: %s", e)
        try:
            conn.logout()
        except Exception:
            pass
        return None, []


def _fetch_message(conn: imaplib.IMAP4_SSL, uid: bytes) -> Optional[email.message.Message]:
    try:
        status, data = conn.uid("FETCH", uid, "(RFC822)")
        if status != "OK" or not data or not data[0]:
            return None
        raw = data[0][1]
        if isinstance(raw, bytes):
            return email.message_from_bytes(raw)
        return email.message_from_string(raw)
    except Exception as e:
        logger.error("RSVP poller: FETCH uid=%s failed: %s", uid, e)
        return None


def _mark_seen(conn: imaplib.IMAP4_SSL, uid: bytes) -> None:
    try:
        conn.uid("STORE", uid, "+FLAGS", r"(\Seen)")
    except Exception as e:
        logger.warning("RSVP poller: failed to mark uid=%s as Seen: %s", uid, e)


# ---------------------------------------------------------------------------
# Mongo-side: idempotency + participant update
# ---------------------------------------------------------------------------

async def _already_processed(db, message_id: str) -> bool:
    if not message_id:
        return False
    doc = await db.processed_rsvp_emails.find_one({"message_id": message_id}, {"_id": 0})
    return doc is not None


async def _record_processed(
    db,
    message_id: str,
    meeting_id: Optional[str],
    attendee_email: Optional[str],
    new_status: Optional[str],
    outcome: str,
) -> None:
    """Outcome is one of: 'applied' | 'no_match' | 'parse_failed' | 'no_calendar'."""
    if not message_id:
        return
    await db.processed_rsvp_emails.insert_one({
        "message_id": message_id,
        "meeting_id": meeting_id,
        "attendee_email": attendee_email,
        "new_status": new_status,
        "outcome": outcome,
        "processed_at": datetime.now(timezone.utc).isoformat(),
    })


async def _apply_rsvp(db, reply: dict) -> str:
    """
    Match the parsed reply to a (meeting, user) pair and update their
    participant row. Returns the outcome string for telemetry.
    """
    meeting_id = reply["meeting_id"]
    attendee_email = reply["attendee_email"].lower()
    new_status = reply["response_status"]

    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0, "id": 1})
    if not meeting:
        logger.warning(
            "RSVP poller: meeting id %s not found for %s → skip",
            meeting_id, attendee_email,
        )
        return "no_match"

    user = await db.users.find_one({"email": attendee_email}, {"_id": 0, "id": 1})
    if not user:
        logger.warning(
            "RSVP poller: user with email %s not found (meeting %s) → skip",
            attendee_email, meeting_id,
        )
        return "no_match"

    result = await db.meeting_participants.update_one(
        {"meeting_id": meeting_id, "user_id": user["id"]},
        {"$set": {
            "response_status": new_status,
            "responded_at": datetime.now(timezone.utc).isoformat(),
            "responded_via": "email_rsvp",
        }},
    )
    if result.matched_count == 0:
        logger.warning(
            "RSVP poller: %s is not a participant of meeting %s",
            attendee_email, meeting_id,
        )
        return "no_match"

    logger.info(
        "RSVP poller: applied %s for %s on meeting %s",
        new_status, attendee_email, meeting_id,
    )
    return "applied"


# ---------------------------------------------------------------------------
# Public entrypoint — called from scheduler.py once per cycle
# ---------------------------------------------------------------------------

async def poll_rsvp_replies(db) -> None:
    """One poll cycle. Safe to call repeatedly — fully idempotent via Mongo."""
    cfg = _imap_config()
    if not cfg:
        logger.debug(
            "RSVP poller: IMAP not configured (need IMAP_USER + IMAP_PASSWORD); skipping"
        )
        return

    conn, uids = _connect_and_search(cfg)
    if conn is None:
        return

    try:
        for uid in uids:
            msg = _fetch_message(conn, uid)
            if msg is None:
                continue
            message_id = (msg.get("Message-ID") or "").strip().strip("<>")

            if await _already_processed(db, message_id):
                _mark_seen(conn, uid)
                continue

            parts = extract_ics_from_email(msg)
            if not parts:
                await _record_processed(db, message_id, None, None, None, "no_calendar")
                _mark_seen(conn, uid)
                continue

            applied_any = False
            for ics_text in parts:
                reply = parse_ics_reply(ics_text)
                if not reply:
                    continue
                outcome = await _apply_rsvp(db, reply)
                await _record_processed(
                    db,
                    message_id,
                    reply["meeting_id"],
                    reply["attendee_email"],
                    reply["response_status"],
                    outcome,
                )
                applied_any = True

            if not applied_any:
                await _record_processed(db, message_id, None, None, None, "parse_failed")

            _mark_seen(conn, uid)
    finally:
        try:
            conn.logout()
        except Exception:
            pass
