#!/usr/bin/env python3
"""
BioMedMeet marketing outreach campaign sender.

Reads contacts from MongoDB (default) or a CSV/XLSX and sends a country-aware
marketing email to each one — with 7 product video links, a "How it works"
section, and a demo CTA — via Gmail SMTP.

This module is **completely isolated** from the BioMedMeet application code.
It lives in /app/marketing_outreach/ which is excluded from the Docker build
context and from git in the deployment workflow.

KEY DESIGN DECISIONS
====================
1. **One email per contact.**  Each hospital contact receives their own
   personalised copy.  You can optionally BCC yourself on every send via the
   SELF_BCC env var (set in .env).

2. **MongoDB-first contact store.**  Load Apollo/ZoomInfo/Hunter/LinkedIn
   exports into the `marketing_contacts` collection in the `biomedmeet_marketing`
   database, then this script queries Mongo for un-sent contacts.

3. **Country-parameterised.**  `--country US|EU|UK|IN` filters the Mongo
   query AND switches the legal footer.

4. **Idempotent & resumable.**  Every contact's status updates inline in
   Mongo: pending → sent / failed.  Re-running the script picks up where it
   left off.

5. **--dry-run by default.**  Pass `--send` to actually send.

USAGE
=====
    cd /app/marketing_outreach

    # 1) Load Apollo XLSX into Mongo (one-time per export)
    python3 -m marketing_outreach.load_to_mongo \\
        --input data/Hospital_Contact_Detail_V2.xlsx --replace

    # 2) Dry-run — render HTML previews to _runs/preview/, send nothing
    python3 -m marketing_outreach.send_campaign --country US --limit 3

    # 3) Test send a single email to YOUR inbox
    python3 -m marketing_outreach.send_campaign --country US --limit 1 \\
        --override-recipient you@example.com --send

    # 4) Real send, US, 100/day cap
    python3 -m marketing_outreach.send_campaign --country US \\
        --send --daily-cap 100

    # 5) Read from a CSV instead of Mongo
    python3 -m marketing_outreach.send_campaign --country US \\
        --source csv --csv data/some_export.csv --send
"""
from __future__ import annotations

import argparse
import csv
import os
import smtplib
import ssl
import sys
import time
from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import make_msgid, formataddr
from pathlib import Path

from dotenv import load_dotenv

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from marketing_outreach.email_template import (  # noqa: E402
    render_html,
    render_plain_text,
    render_subject,
)


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

load_dotenv(HERE / ".env")

SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = (os.environ.get("SMTP_PASSWORD", "") or "").replace(" ", "")  # Gmail app passwords paste with spaces
SENDER_NAME = os.environ.get("SENDER_NAME", "BioMedMeet Team")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", SMTP_USER)
SENDER_POSTAL_ADDRESS = os.environ.get("SENDER_POSTAL_ADDRESS", "")
SELF_BCC = os.environ.get("SELF_BCC", "").strip() or None
DAILY_CAP_DEFAULT = int(os.environ.get("DAILY_CAP", "300"))
PER_EMAIL_PAUSE = float(os.environ.get("PER_EMAIL_PAUSE", "1.5"))

MARKETING_DB_URL = os.environ.get("MARKETING_DB_URL", "mongodb://localhost:27017")
MARKETING_DB_NAME = os.environ.get("MARKETING_DB_NAME", "biomedmeet_marketing")
COLLECTION = "marketing_contacts"

RUNS_DIR = HERE / "_runs"
RUNS_DIR.mkdir(exist_ok=True)


# ---------------------------------------------------------------------------
# Contact loaders
# ---------------------------------------------------------------------------

def load_from_mongo(country: str, limit: int | None) -> tuple[list[dict], object]:
    """Return (contacts, collection_handle). Use the handle to update status."""
    from pymongo import MongoClient
    client = MongoClient(MARKETING_DB_URL, serverSelectionTimeoutMS=8000)
    coll = client[MARKETING_DB_NAME][COLLECTION]

    query = {
        "country": country.upper(),
        "status": {"$in": ["pending", None]},
        "contact_email": {"$regex": r"^[^@\s]+@[^@\s]+\.[^@\s]+$"},  # valid-ish
    }
    cur = coll.find(query)
    if limit:
        cur = cur.limit(limit)
    contacts = list(cur)
    return contacts, coll


def load_from_csv(path: Path) -> list[dict]:
    with open(path, newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        return [{k.strip(): (v or "").strip() for k, v in row.items()} for row in reader]


# ---------------------------------------------------------------------------
# Email composer
# ---------------------------------------------------------------------------

def compose_email(row: dict, country: str, recipient_override: str | None = None) -> EmailMessage:
    hospital = row.get("hospital_name") or row.get("company") or "your hospital"
    team = row.get("digital_team_name") or row.get("departments") or ""
    first = (
        row.get("contact_first_name")
        or row.get("first_name")
        or (row.get("contact_person") or "").split(" ")[0]
    )
    full = row.get("contact_person") or (
        f"{row.get('first_name','')} {row.get('last_name','')}".strip()
    )
    title = row.get("title") or row.get("digital_team_name") or ""
    # `recipient_override` may be a single email or a comma-separated list.
    raw_override = (recipient_override or "").strip()
    if raw_override:
        to_addrs = [a.strip() for a in raw_override.split(",") if a.strip()]
    else:
        single = (row.get("contact_email") or row.get("email", "")).strip()
        to_addrs = [single] if single else []
    if not to_addrs:
        raise ValueError("no recipient email")
    to_addr = to_addrs[0]   # used only for personalisation context

    subject = render_subject(country, hospital)
    html = render_html(
        country=country,
        hospital=hospital,
        team_name=team,
        contact_first_name=first,
        contact_full_name=full,
        contact_title=title,
        sender_name=SENDER_NAME,
        sender_email=SENDER_EMAIL,
        sender_postal_address=SENDER_POSTAL_ADDRESS,
    )
    plain = render_plain_text(
        hospital=hospital,
        team_name=team,
        contact_first_name=first,
        contact_full_name=full,
        contact_title=title,
        sender_name=SENDER_NAME,
        sender_email=SENDER_EMAIL,
    )

    msg = EmailMessage()
    msg["From"] = formataddr((SENDER_NAME, SENDER_EMAIL))
    # PRIVACY: recipient email goes in the SMTP envelope only — NEVER in the
    # To header. The visible To shows "Undisclosed Recipients" so the email
    # address is invisible even if the message is forwarded.
    msg["To"] = formataddr(("Undisclosed Recipients", SENDER_EMAIL))
    msg["Subject"] = subject
    msg["Reply-To"] = SENDER_EMAIL
    msg["Message-ID"] = make_msgid(domain=SENDER_EMAIL.split("@")[-1])
    msg["X-Campaign"] = f"biomedmeet-outreach-{country.lower()}"
    msg["List-Unsubscribe"] = f"<mailto:{SENDER_EMAIL}?subject=UNSUBSCRIBE>"
    msg["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"

    # The actual envelope recipients (used by send_message via to_addrs=).
    # We stash them on the message object so the sender loop can pick them up.
    msg._bcc_recipients = [to_addr]  # type: ignore[attr-defined]
    if SELF_BCC:
        msg._bcc_recipients.append(SELF_BCC)  # type: ignore[attr-defined]

    msg.set_content(plain)
    msg.add_alternative(html, subtype="html")
    return msg


# ---------------------------------------------------------------------------
# SMTP
# ---------------------------------------------------------------------------

def smtp_connect() -> smtplib.SMTP:
    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30)
    server.ehlo()
    server.starttls(context=ssl.create_default_context())
    server.ehlo()
    server.login(SMTP_USER, SMTP_PASSWORD)
    return server


# ---------------------------------------------------------------------------
# Per-run log
# ---------------------------------------------------------------------------

def open_run_log(country: str):
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = RUNS_DIR / f"{ts}_{country.lower()}.csv"
    fh = open(path, "w", newline="", encoding="utf-8")
    w = csv.DictWriter(
        fh,
        fieldnames=["timestamp", "hospital_name", "contact_email", "country", "status", "error"],
    )
    w.writeheader()
    w._fh = fh  # type: ignore[attr-defined]
    return path, w


def _logrow(status, hospital, email, country, note):
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "hospital_name": hospital,
        "contact_email": email,
        "country": country,
        "status": status,
        "error": note,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--country", required=True, choices=["US", "EU", "UK", "IN"])
    p.add_argument("--source", choices=["mongo", "csv"], default="mongo")
    p.add_argument("--csv", type=Path, default=None,
                   help="Path to CSV (only when --source csv).")
    p.add_argument("--send", action="store_true",
                   help="Actually send. Without this, runs in dry-run mode.")
    p.add_argument("--limit", type=int, default=None)
    p.add_argument("--override-recipient", default=None,
                   help="Send every email to this address (for test sends).")
    p.add_argument("--daily-cap", type=int, default=DAILY_CAP_DEFAULT)
    p.add_argument("--per-email-pause", type=float, default=PER_EMAIL_PAUSE)
    args = p.parse_args(argv)

    if args.send and not (SMTP_USER and SMTP_PASSWORD):
        p.error("SMTP_USER / SMTP_PASSWORD not set in .env — cannot send.")
    if args.source == "csv" and not args.csv:
        p.error("--source csv requires --csv <path>")

    # Load contacts
    coll = None
    if args.source == "mongo":
        contacts, coll = load_from_mongo(args.country, args.limit)
    else:
        contacts = load_from_csv(args.csv)
        if args.limit:
            contacts = contacts[: args.limit]

    print("=" * 70)
    print(f"BioMedMeet outreach · country={args.country} · source={args.source}")
    print(f"Contacts to process: {len(contacts):,}  ·  daily_cap={args.daily_cap}")
    print(f"Mode: {'SEND' if args.send else 'DRY-RUN'}"
          f"  ·  override_recipient={args.override_recipient or '(none)'}")
    print(f"Sender: {SENDER_NAME} <{SENDER_EMAIL}>  ·  self-BCC: {SELF_BCC or '(none)'}")
    print("=" * 70)

    log_path, log_writer = open_run_log(args.country)
    server = smtp_connect() if args.send else None
    sent = failed = skipped = 0

    try:
        for i, row in enumerate(contacts, 1):
            country = (row.get("country") or args.country).upper()
            hospital = row.get("hospital_name") or row.get("company") or "(no hospital)"
            email = (row.get("contact_email") or row.get("email") or "").strip()

            if not email or "@" not in email:
                print(f"  [{i:4d}] SKIP  {hospital[:48]:<48}  · no email")
                log_writer.writerow(_logrow("skipped", hospital, email, country, "no_email"))
                skipped += 1
                continue

            if sent >= args.daily_cap:
                print(f"  [{i:4d}] STOP  daily cap of {args.daily_cap} reached.")
                log_writer.writerow(_logrow("skipped", hospital, email, country, "daily_cap"))
                skipped += 1
                continue

            try:
                msg = compose_email(row, country, recipient_override=args.override_recipient)
            except Exception as e:
                print(f"  [{i:4d}] FAIL  {hospital[:48]:<48}  · compose error: {e}")
                log_writer.writerow(_logrow("failed", hospital, email, country, f"compose:{e}"))
                failed += 1
                continue

            if not args.send:
                preview_dir = RUNS_DIR / "preview"
                preview_dir.mkdir(exist_ok=True)
                fname = preview_dir / f"{i:04d}_{country}_{hospital[:32].replace('/', '_').replace(' ', '_')}.html"
                fname.write_text(msg.get_body(("html",)).get_content(), encoding="utf-8")
                print(f"  [{i:4d}] DRY   {hospital[:48]:<48}  → {fname.name}")
                log_writer.writerow(_logrow("dry-run", hospital, email, country, str(fname.name)))
                continue

            try:
                # Use envelope-only recipients (BCC pattern). To header stays as
                # "Undisclosed Recipients" — the contact's email is invisible.
                server.send_message(
                    msg,
                    from_addr=SENDER_EMAIL,
                    to_addrs=msg._bcc_recipients,  # type: ignore[attr-defined]
                )
                envelope_str = ", ".join(msg._bcc_recipients)  # type: ignore[attr-defined]
                print(f"  [{i:4d}] SENT  {hospital[:42]:<42}  → {envelope_str} (BCC)")
                log_writer.writerow(_logrow("sent", hospital, email, country, ""))
                if coll is not None and "_id" in row:
                    coll.update_one(
                        {"_id": row["_id"]},
                        {"$set": {
                            "status": "sent",
                            "last_attempt_at": datetime.now(timezone.utc),
                            "last_error": None,
                        }},
                    )
                sent += 1
                time.sleep(args.per_email_pause)
            except smtplib.SMTPException as e:
                print(f"  [{i:4d}] FAIL  {hospital[:48]:<48}  · smtp: {e}")
                log_writer.writerow(_logrow("failed", hospital, email, country, f"smtp:{e}"))
                if coll is not None and "_id" in row:
                    coll.update_one(
                        {"_id": row["_id"]},
                        {"$set": {
                            "status": "failed",
                            "last_attempt_at": datetime.now(timezone.utc),
                            "last_error": str(e)[:500],
                        }},
                    )
                failed += 1
                time.sleep(5)

    finally:
        if server is not None:
            try:
                server.quit()
            except Exception:
                pass
        log_writer._fh.close()  # type: ignore[attr-defined]

    print("-" * 70)
    print(f"Done. sent={sent}  failed={failed}  skipped={skipped}  log={log_path}")
    return 0 if failed == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
