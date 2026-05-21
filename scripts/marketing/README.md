# BioMedMeet · Marketing outreach pipeline

A self-contained, country-aware email-outreach kit for promoting BioMedMeet to
hospital digital-transformation teams.

```
scripts/marketing/
├── .env.example          → copy to .env, fill in real credentials
├── send_campaign.py      → the sender (CLI). reads .env + a CSV.
├── import_contacts.py    → normalises Apollo / ZoomInfo / Hunter exports
├── email_template.py     → HTML + plain-text email body, 7 video links
├── legal_footers.py      → per-country compliance footers
├── healthcare_us.csv     → 20-row seed list (US, generic inboxes)
├── healthcare_in.csv     → 20-row seed list (India, generic inboxes)
├── healthcare_template.csv  → blank template
└── _runs/                → per-run send logs + dry-run previews (gitignored)
```

---

## 0. Quick start

```bash
cd scripts/marketing

# (one-time) install deps in your venv
pip install python-dotenv

# verify your credentials are loaded
python3 -c "from dotenv import load_dotenv; load_dotenv('.env'); import os; print('OK ' + os.environ['SMTP_USER'])"
```

---

## 1. Test the pipeline (zero risk)

```bash
# Render the first 3 emails as HTML files in _runs/preview/ — does NOT send.
python3 send_campaign.py --country US --csv healthcare_us.csv --limit 3
```

Open one of the generated files in `_runs/preview/` in a browser to review the
exact email each hospital will receive.

---

## 2. Send a single test to your own inbox

```bash
python3 send_campaign.py \
    --country US --csv healthcare_us.csv \
    --limit 1 --override-recipient your.personal@gmail.com \
    --send
```

This routes the email to your address (instead of the CSV's). Verify it lands,
looks right on mobile + desktop, and all video links work. Then…

---

## 3. Real campaign — US

```bash
python3 send_campaign.py \
    --country US --csv healthcare_us.csv \
    --send --daily-cap 100
```

Output: per-row status (SENT / FAIL / SKIP) + a run log written to
`_runs/<timestamp>_us.csv` for audit.

---

## 4. Real campaign — India

```bash
python3 send_campaign.py \
    --country IN --csv healthcare_in.csv \
    --send --daily-cap 100
```

The country flag switches:
- Subject-line wording
- Legal footer (CAN-SPAM → DPDP Act 2023)
- Per-row `country` column still takes precedence if you have a mixed sheet.

---

## 5. Real campaign — UK

The same `send_campaign.py` works with `--country UK`. The script applies the
GDPR / UK-PECR footer automatically. Build a UK CSV from Apollo/ZoomInfo
exports (see step 6).

---

## 6. Importing contact lists from Apollo / ZoomInfo / Hunter / LinkedIn

Direct LinkedIn scraping violates LinkedIn's TOS. Use a licensed enrichment
tool instead — they have free tiers, and they've already done the licensing
properly.

### Recommended workflow

1. Sign up for a free trial of **Apollo.io** (or ZoomInfo, Hunter, or
   LinkedIn Sales Navigator).
2. Search for hospitals → filter for titles like "Digital Transformation",
   "Chief Digital Officer", "Director of IT", "VP Information Systems".
3. Export the result as CSV.
4. Normalise it to the BioMedMeet schema:

   ```bash
   python3 import_contacts.py \
       --input apollo_export.csv \
       --country US \
       --output healthcare_us.csv
   ```

   The script auto-detects Apollo / ZoomInfo / Hunter / LinkedIn / generic
   formats. You can force one with `--source apollo`.

5. Merge multiple exports into one campaign CSV:

   ```bash
   python3 import_contacts.py \
       --input apollo.csv zoominfo.csv hunter.csv \
       --country US \
       --output healthcare_us.csv
   ```

   Deduplication by email is on by default.

---

## 7. Resuming after a failure

Every row gets logged to `_runs/<timestamp>_<country>.csv` with status
`sent` / `failed` / `skipped`. If a run dies halfway:

1. Look at the latest log file to see which rows were sent.
2. Open the source CSV in Excel/Sheets and add `status=sent` for those rows.
3. Re-run — rows with `status=sent` are skipped automatically.

---

## 8. Daily limits

| Sending account | Gmail/day | Recommended `--daily-cap` |
|---|---|---|
| Regular Gmail (free) | 500 | 100–300 |
| Google Workspace | 2,000 | 300–800 |

The script throttles between sends (`PER_EMAIL_PAUSE`, default 1.5s) to avoid
SMTP rate-limit errors.

---

## 9. Unsubscribe handling

Every email includes:

- `List-Unsubscribe` and `List-Unsubscribe-Post` headers (Gmail/Outlook
  one-click unsubscribe button)
- A clear `UNSUBSCRIBE` reply instruction in the body
- A country-appropriate legal footer

When you receive an `UNSUBSCRIBE` reply:

1. Open `healthcare_<country>.csv`.
2. Change that row's `status` to `unsubscribed`.
3. The script will skip it on future runs.

You can also keep a separate `unsubscribed.csv` and use grep/excel to filter
before each campaign — same effect.

---

## 10. Compliance notes (read before pressing --send)

| Region | Law | Risk level | Built-in mitigation |
|---|---|---|---|
| **US** | CAN-SPAM | Low | Postal address + unsubscribe instructions in footer. |
| **EU/UK** | GDPR + ePrivacy | High | Footer claims "legitimate interest" lawful basis; you should still have your own LIA on file. |
| **India** | DPDP 2023 | Medium | Footer references DPDP and 7-day deletion on request. |

This is engineering hygiene, not legal advice. For volume campaigns, have a
lawyer review the email and footer.

---

## 11. Where everything goes

```
demo@biomedmeet.com   ← all outbound
Niraj.k.vishwakarma@gmail.com   ← gets a hidden BCC of every send (SELF_BCC in .env)
Replies / UNSUBSCRIBE messages  → demo@biomedmeet.com inbox
Run logs                         → scripts/marketing/_runs/*.csv
Dry-run HTML previews            → scripts/marketing/_runs/preview/*.html
```
