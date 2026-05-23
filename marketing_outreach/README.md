# BioMedMeet · Marketing outreach pipeline

A self-contained, country-aware email-outreach kit for promoting BioMedMeet
to hospital digital-transformation teams.

## ⚠ Important: this folder is intentionally OUT of the Docker build

`/app/marketing_outreach/` is excluded from:
- **`.dockerignore`** (root + frontend) — never copied into any container
- **`.gitignore`** — only `.env` and `_runs/` are gitignored; the code itself
  is in your GitHub repo so you can run it on your laptop or a dedicated
  marketing host

When you install BioMedMeet for a hospital via Docker, **none of this kit
ships with it**.  It exists purely for **your own** sales/marketing efforts.

## 📁 Layout

```
marketing_outreach/
├── .env.example          → copy to .env, fill in real credentials
├── .env                  → gitignored — your real SMTP creds + Mongo URI
├── load_to_mongo.py      → load Apollo/ZoomInfo XLSX → MongoDB
├── send_campaign.py      → the sender (CLI). reads Mongo or CSV.
├── import_contacts.py    → normalise raw exports to BioMedMeet schema
├── email_template.py     → HTML + plain-text body, "How it works", 7 video cards
├── legal_footers.py      → per-country compliance footers
├── data/
│   └── Hospital_Contact_Detail_V2.xlsx   → your Apollo export
├── healthcare_us.csv     → small CSV seed list (legacy / fallback)
├── healthcare_in.csv     → small CSV seed list (India fallback)
└── _runs/                → per-run logs + dry-run previews (gitignored)
```

## 🗃 MongoDB layout

The kit talks to a **separate MongoDB database** from the BioMedMeet
application:

| BioMedMeet app | Marketing kit |
|---|---|
| `hospital_meeting_scheduler` | `biomedmeet_marketing` |
| Collections: meetings, patients, users, …  | Collection: `marketing_contacts` |

Override defaults in `.env` if needed:
```ini
MARKETING_DB_URL=mongodb://localhost:27017
MARKETING_DB_NAME=biomedmeet_marketing
```

## 🚀 End-to-end workflow

### 0. One-time setup

```bash
cd /app/marketing_outreach
pip install python-dotenv pymongo openpyxl
cp .env.example .env
$EDITOR .env     # fill in SMTP_*, SENDER_*, MARKETING_DB_*
```

### 1. Load Apollo / ZoomInfo / Hunter export into MongoDB

```bash
# Place the export under data/
python3 -m marketing_outreach.load_to_mongo \
    --input data/Hospital_Contact_Detail_V2.xlsx \
    --email-status Verified \
    --replace
```

Output:
```
parsed 1,923 rows with an email address
  email_status=Verified: 1,923 → 1,922
  deduped on email: 1,922 → 1,915
inserted 1,915 rows
By country:
  US     1,772
  IN       143
```

The script auto-classifies countries (United States → `US`, India → `IN`,
UK/EU recognised too).

### 2. Dry-run — render HTML previews, send nothing

```bash
python3 -m marketing_outreach.send_campaign --country US --limit 3
```

HTML files land in `_runs/preview/`. Open one in a browser to QA the
personalisation:

> *Dear Aaron, As Chief Technology Officer at Ochsner Health, I think
> BioMedMeet may be directly relevant to your work on …*

### 3. Test-send a single email to YOUR inbox

```bash
python3 -m marketing_outreach.send_campaign --country US --limit 1 \
    --override-recipient Niraj.k.vishwakarma@gmail.com --send
```

Verify it lands in your inbox, looks right on desktop + mobile, all 7 video
links and the 4 step thumbnails load, and the Book-a-demo button works.

### 4. Real campaign — US, capped at 100/day

```bash
python3 -m marketing_outreach.send_campaign --country US \
    --send --daily-cap 100
```

The script:
- Queries Mongo for contacts where `country=US` AND `status=pending`
- Sends one personalised email per contact (you BCC'd via SELF_BCC)
- Updates `status: sent | failed` directly in Mongo
- Writes a per-run log to `_runs/<timestamp>_us.csv`

### 5. Real campaign — India

```bash
python3 -m marketing_outreach.send_campaign --country IN \
    --send --daily-cap 100
```

The country flag switches:
- Subject-line wording
- Legal footer (CAN-SPAM → DPDP Act 2023)

### 6. Real campaign — UK

```bash
python3 -m marketing_outreach.send_campaign --country UK \
    --send --daily-cap 50
```

GDPR / UK-PECR footer is applied automatically.

## 📧 What's in the email

Every email contains:

1. Personalised greeting (real first name, hospital, job title)
2. 3-paragraph pitch
3. 3 colour-coded highlight chips (Teams · Timezone · Audit trail)
4. **"How it works" section** with 4 numbered steps + images linked to
   `biomedmeet.com/home/how-it-works.html#step{n}`
5. **"Watch · 90-second walkthroughs"** with 7 video cards linked to
   `biomedmeet.com/marketing/*.mp4`
6. Two CTAs: "Book a 15-min demo" + "Open biomedmeet.com"
7. Country-aware legal footer (CAN-SPAM / GDPR / DPDP)
8. Standards-compliant `List-Unsubscribe` headers (Gmail/Outlook one-click)

## 🔁 Status workflow in MongoDB

Each contact in `marketing_contacts` carries:
- `status`: `pending` → `sent` / `failed` / `unsubscribed` / `bounced`
- `last_attempt_at`: ISO datetime
- `last_error`: SMTP error text (if failed)

To re-attempt failed sends:
```bash
# Reset failed → pending
mongosh biomedmeet_marketing --eval '
  db.marketing_contacts.updateMany({status:"failed"}, {$set:{status:"pending"}})
'
# Then re-run send_campaign.py
```

To mark someone as unsubscribed when they reply UNSUBSCRIBE:
```bash
mongosh biomedmeet_marketing --eval '
  db.marketing_contacts.updateOne(
    {contact_email:"someone@example.com"},
    {$set:{status:"unsubscribed"}}
  )
'
```

## 🗄 Reading from a CSV instead of MongoDB

If you don't want to use Mongo, drop a CSV in `data/` and pass `--source csv`:
```bash
python3 -m marketing_outreach.send_campaign --country US \
    --source csv --csv data/healthcare_us.csv --send
```

## 📊 Sending limits

| Sending account | Gmail/day | Recommended `--daily-cap` |
|---|---|---|
| Regular Gmail (free) | 500 | 100–300 |
| Google Workspace | 2,000 | 300–800 |

The script throttles `PER_EMAIL_PAUSE` (default 1.5s) between sends to avoid
SMTP rate-limit errors.

## ⚖ Compliance notes (read before pressing --send)

| Region | Law | Risk | Mitigation built-in |
|---|---|---|---|
| **US** | CAN-SPAM | Low | Postal address + unsubscribe in footer. |
| **EU/UK** | GDPR + ePrivacy | High | Footer claims "legitimate interest"; you should still have your own LIA on file. |
| **India** | DPDP 2023 | Medium | Footer references DPDP and 7-day deletion. |

This is engineering hygiene, not legal advice. For volume campaigns, have a
lawyer review the email + footers.

## 🔧 Updating the email template

If you want to change wording, video lineup, step descriptions, or styling:

1. Edit `email_template.py`
2. Dry-run to verify: `python3 -m marketing_outreach.send_campaign --country US --limit 1`
3. Open the HTML in `_runs/preview/` to QA
4. When happy, real-send.

The MP4 step thumbnails referenced in the "How it works" section live at
`/app/frontend/public/marketing/thumbs/step{1..4}.jpg` and ship with the
public site, so they load reliably in email clients.
