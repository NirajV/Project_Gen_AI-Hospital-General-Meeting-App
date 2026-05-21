#!/usr/bin/env python3
"""
BioMedMeet marketing outreach campaign sender.

Reads a CSV of hospitals + contacts and sends a country-aware marketing email
to each one — with 7 product video links and a demo CTA — via Gmail SMTP.

KEY DESIGN DECISIONS
====================
1. **One email per hospital, with the hospital's contact in BCC.**  This is
   far safer than putting many hospitals in BCC of a single email — the latter
   reveals the campaign's existence to every reply and routinely trips spam
   filters.  Each hospital gets a personalised greeting + their own copy.

2. **You are always BCC'd.**  Set SELF_BCC in .env to get a hidden copy of
   every outbound message so you can monitor delivery and replies.

3. **Country-parameterised.**  `--country US|EU|UK|IN` switches the subject
   line, greeting nuance, and the legal footer (CAN-SPAM / GDPR / DPDP).

4. **Idempotent and resumable.**  Every run logs each row's status to
   _runs/<timestamp>.csv.  Re-running with the same CSV after a crash skips
   rows that already have status=sent.

5. **--dry-run by default if no flag is set.**  Prints the rendered emails to
   stdout instead of sending.  You must pass `--send` to actually send.

USAGE
=====
    cd /app/scripts/marketing

    # 1) Preview without sending (writes rendered HTML to _runs/preview/)
    python3 send_campaign.py --country US --csv healthcare_us.csv

    # 2) Test-send a single email to yourself
    python3 send_campaign.py --country US --csv healthcare_us.csv \
        --limit 1 --override-recipient you@example.com --send

    # 3) Real send, US, 100/day cap
    python3 send_campaign.py --country US --csv healthcare_us.csv \
        --send --daily-cap 100

    # 4) EU campaign with generic inboxes only
    python3 send_campaign.py --country EU --csv healthcare_eu.csv --send

    # 5) India campaign
    python3 send_campaign.py --country IN --csv healthcare_in.csv --send

CSV FORMAT
==========
Required columns (case-insensitive header):
    hospital_name, digital_team_name, contact_person, contact_email, phone

Optional columns:
    contact_first_name, country, status

`country` per-row overrides the CLI --country flag (handy for mixed sheets).
`status` is written back by the script: "" -> "sent" -> "failed" -> "skipped".
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
from typing import Iterator

from dotenv import load_dotenv

# Allow running both as a module and as a script
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent))

from scripts.marketing.email_template import (  # noqa: E402
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
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SENDER_NAME = os.environ.get("SENDER_NAME", "BioMedMeet Team")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", SMTP_USER)
SENDER_POSTAL_ADDRESS = os.environ.get("SENDER_POSTAL_ADDRESS", "")
SELF_BCC = os.environ.get("SELF_BCC", "").strip() or None
DAILY_CAP_DEFAULT = int(os.environ.get("DAILY_CAP", "300"))
PER_EMAIL_PAUSE = float(os.environ.get("PER_EMAIL_PAUSE", "1.5"))

RUNS_DIR = HERE / "_runs"
RUNS_DIR.mkdir(exist_ok=True)


# ---------------------------------------------------------------------------
# CSV loader
# ---------------------------------------------------------------------------

REQUIRED = {"hospital_name", "contact_email"}
OPTIONAL = {
    "digital_team_name",
    "contact_person",
    "contact_first_name",
    "phone",
    "country",
    "status",
}


def _normalise_headers(headers: list[str]) -> dict[str, str]:
    return {h.strip().lower().replace(" ", "_"): h for h in headers}


def load_rows(path: Path) -> tuple[list[str], list[dict]]:
    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        original_headers = reader.fieldnames or []
        mapping = _normalise_headers(original_headers)
        missing = REQUIRED - set(mapping.keys())
        if missing:
            raise SystemExit(
                f"CSV {path} is missing required columns: {sorted(missing)}.\n"
                f"Found columns: {sorted(mapping.keys())}"
            )
        rows = []
        for raw in reader:
            row = {key: (raw.get(orig, "") or "").strip() for key, orig in mapping.items()}
            rows.append(row)
    return original_headers, rows


# ---------------------------------------------------------------------------
# Email composer
# ---------------------------------------------------------------------------

def compose_email(
    row: dict,
    country: str,
    recipient_override: str | None = None,
) -> EmailMessage:
    hospital = row.get("hospital_name", "") or "your hospital"
    team = row.get("digital_team_name", "") or "the digital transformation team"
    contact_first = row.get("contact_first_name") or (
        row.get("contact_person", "").split(" ")[0] if row.get("contact_person") else ""
    )
    to_addr = recipient_override or row["contact_email"]

    subject = render_subject(country, hospital)
    html = render_html(
        country=country,
        hospital=hospital,
        team_name=team,
        contact_first_name=contact_first,
        sender_name=SENDER_NAME,
        sender_email=SENDER_EMAIL,
        sender_postal_address=SENDER_POSTAL_ADDRESS,
        recipient_email=to_addr,
    )
    plain = render_plain_text(
        hospital=hospital,
        team_name=team,
        contact_first_name=contact_first,
        sender_name=SENDER_NAME,
        sender_email=SENDER_EMAIL,
    )

    msg = EmailMessage()
    msg["From"] = formataddr((SENDER_NAME, SENDER_EMAIL))
    msg["To"] = to_addr
    if SELF_BCC:
        msg["Bcc"] = SELF_BCC
    msg["Subject"] = subject
    msg["Reply-To"] = SENDER_EMAIL
    msg["Message-ID"] = make_msgid(domain=SENDER_EMAIL.split("@")[-1])
    msg["X-Campaign"] = f"biomedmeet-outreach-{country.lower()}"
    msg["List-Unsubscribe"] = f"<mailto:{SENDER_EMAIL}?subject=UNSUBSCRIBE>"
    msg["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"

    msg.set_content(plain)
    msg.add_alternative(html, subtype="html")
    return msg


# ---------------------------------------------------------------------------
# Sender
# ---------------------------------------------------------------------------

def smtp_connect() -> smtplib.SMTP:
    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30)
    server.ehlo()
    server.starttls(context=ssl.create_default_context())
    server.ehlo()
    server.login(SMTP_USER, SMTP_PASSWORD)
    return server


def send_one(server: smtplib.SMTP, msg: EmailMessage) -> None:
    server.send_message(msg)


# ---------------------------------------------------------------------------
# Per-run log
# ---------------------------------------------------------------------------

def open_run_log(country: str) -> tuple[Path, "csv.DictWriter"]:
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = RUNS_DIR / f"{ts}_{country.lower()}.csv"
    fh = open(path, "w", newline="", encoding="utf-8")
    writer = csv.DictWriter(
        fh,
        fieldnames=["timestamp", "hospital_name", "contact_email", "country", "status", "error"],
    )
    writer.writeheader()
    writer._fh = fh  # type: ignore[attr-defined]
    return path, writer


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Send the BioMedMeet outreach campaign to a CSV of hospitals.",
    )
    parser.add_argument("--country", required=True, choices=["US", "EU", "UK", "IN"],
                        help="Default country for legal footer & subject line.")
    parser.add_argument("--csv", required=True, type=Path,
                        help="Path to the CSV of hospitals/contacts.")
    parser.add_argument("--send", action="store_true",
                        help="Actually send emails. Without this flag we run in --dry-run mode.")
    parser.add_argument("--limit", type=int, default=None,
                        help="Send/preview at most N rows (handy for testing).")
    parser.add_argument("--override-recipient", default=None,
                        help="Send every email to this address instead of the CSV one. "
                             "Use this for end-to-end test sends to your own inbox.")
    parser.add_argument("--daily-cap", type=int, default=DAILY_CAP_DEFAULT,
                        help=f"Max sends in this run (default: {DAILY_CAP_DEFAULT}).")
    parser.add_argument("--per-email-pause", type=float, default=PER_EMAIL_PAUSE,
                        help=f"Pause between sends in seconds (default: {PER_EMAIL_PAUSE}).")
    args = parser.parse_args(argv)

    if not args.csv.exists():
        parser.error(f"CSV file not found: {args.csv}")

    if args.send and not (SMTP_USER and SMTP_PASSWORD):
        parser.error("SMTP_USER / SMTP_PASSWORD not set in .env — cannot send.")

    headers, rows = load_rows(args.csv)
    if args.limit:
        rows = rows[: args.limit]

    print("=" * 70)
    print(f"BioMedMeet outreach · country={args.country} · csv={args.csv.name}")
    print(f"Rows={len(rows)} · daily_cap={args.daily_cap} · "
          f"dry_run={not args.send} · override_recipient={args.override_recipient or '(none)'}")
    print(f"Sender: {SENDER_NAME} <{SENDER_EMAIL}>  ·  self-BCC: {SELF_BCC or '(none)'}")
    print("=" * 70)

    run_log_path, writer = open_run_log(args.country)
    server = smtp_connect() if args.send else None
    sent = failed = skipped = 0

    try:
        for i, row in enumerate(rows, 1):
            country = (row.get("country") or args.country).upper()
            hospital = row.get("hospital_name") or "(no hospital)"
            email = row.get("contact_email") or ""

            if not email or "@" not in email:
                print(f"  [{i:3d}] SKIP  {hospital[:48]:<48}  · no email")
                writer.writerow(_logrow("skipped", hospital, email, country, "no_email"))
                skipped += 1
                continue

            if (row.get("status") or "").lower() == "sent":
                print(f"  [{i:3d}] SKIP  {hospital[:48]:<48}  · already sent")
                writer.writerow(_logrow("skipped", hospital, email, country, "already_sent"))
                skipped += 1
                continue

            if sent >= args.daily_cap:
                print(f"  [{i:3d}] STOP  daily cap of {args.daily_cap} reached.")
                writer.writerow(_logrow("skipped", hospital, email, country, "daily_cap"))
                skipped += 1
                continue

            try:
                msg = compose_email(row, country, recipient_override=args.override_recipient)
            except Exception as e:
                print(f"  [{i:3d}] FAIL  {hospital[:48]:<48}  · compose error: {e}")
                writer.writerow(_logrow("failed", hospital, email, country, f"compose:{e}"))
                failed += 1
                continue

            if not args.send:
                preview_dir = RUNS_DIR / "preview"
                preview_dir.mkdir(exist_ok=True)
                fname = preview_dir / f"{i:03d}_{country}_{hospital[:32].replace(' ', '_')}.html"
                fname.write_text(msg.get_body(("html",)).get_content(), encoding="utf-8")
                print(f"  [{i:3d}] DRY   {hospital[:48]:<48}  → {fname.name}")
                writer.writerow(_logrow("dry-run", hospital, email, country, str(fname.name)))
                continue

            try:
                send_one(server, msg)
                print(f"  [{i:3d}] SENT  {hospital[:48]:<48}  → {msg['To']}")
                writer.writerow(_logrow("sent", hospital, email, country, ""))
                sent += 1
                time.sleep(args.per_email_pause)
            except smtplib.SMTPException as e:
                print(f"  [{i:3d}] FAIL  {hospital[:48]:<48}  · smtp: {e}")
                writer.writerow(_logrow("failed", hospital, email, country, f"smtp:{e}"))
                failed += 1
                # back-off briefly on SMTP error
                time.sleep(5)

    finally:
        if server is not None:
            try:
                server.quit()
            except Exception:
                pass
        writer._fh.close()  # type: ignore[attr-defined]

    print("-" * 70)
    print(f"Done. sent={sent}  failed={failed}  skipped={skipped}  log={run_log_path}")
    return 0 if failed == 0 else 2


def _logrow(status, hospital, email, country, note):
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "hospital_name": hospital,
        "contact_email": email,
        "country": country,
        "status": status,
        "error": note,
    }


if __name__ == "__main__":
    sys.exit(main())
