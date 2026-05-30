# MongoDB Data Load & Campaign Resume Guide

> **Audience:** the operator running `marketing_outreach` from the host
> (not from inside Docker). Single source of truth for: (1) loading Apollo /
> ZoomInfo exports into Mongo, and (2) running multi-day staged campaigns
> without sending the same email to the same contact twice.

---

## 1 · One-time setup (do this once per server)

```bash
cd ~/Project_Gen_AI-Hospital-General-Meeting-App

# Create + activate a dedicated venv for the marketing scripts
python3 -m venv venv
source venv/bin/activate

# Install the lean dependency set
pip install -r marketing_outreach/requirements.txt
```

`marketing_outreach/.env` should look like this (Google Workspace path):

```env
# SMTP — Google Workspace
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=demo@biomedmeet.com
SMTP_PASSWORD=<16-char Google app password — spaces OK; the script strips them>

# Sender identity (must DKIM-align with SMTP_USER's domain for inbox placement)
SENDER_NAME=BioMedMeet Team
SENDER_EMAIL=demo@biomedmeet.com
SENDER_POSTAL_ADDRESS=<your registered business address>   # CAN-SPAM requirement

# Privacy
SELF_BCC=                          # leave empty: operator does NOT need a copy of every send
DAILY_CAP=100                      # per-run safety cap (overridable on the CLI)
PER_EMAIL_PAUSE=4                  # seconds between sends — protects sender reputation

# Marketing DB — completely separate from the BioMedMeet application DB
MARKETING_DB_URL=mongodb://localhost:27017
MARKETING_DB_NAME=biomedmeet_marketing
```

> 🔒 `marketing_outreach/.env` is gitignored. Keep it that way — it holds your
> sending credentials.

---

## 2 · Loading the Apollo / ZoomInfo export into Mongo

### Step-by-step

```bash
# Always activate the venv first
cd ~/Project_Gen_AI-Hospital-General-Meeting-App
source venv/bin/activate
```

#### A · First-time import (or after a full re-export from Apollo)

This **drops the existing `marketing_contacts` collection** and replaces it
with the new file. Use this when you've done a fresh Apollo search.

```bash
python3 -m marketing_outreach.load_to_mongo \
    --input marketing_outreach/data/Hospital_Contact_Detail_V2.xlsx \
    --replace
```

#### B · Incremental import (merge with existing list)

This **adds new contacts and updates fields on existing ones**, keyed by email.
Use this when Apollo adds 50 new contacts to your saved search and you only
want those merged in — without touching the send-status of contacts you
already emailed yesterday.

```bash
python3 -m marketing_outreach.load_to_mongo \
    --input marketing_outreach/data/Hospital_Contact_Detail_V2.xlsx \
    --upsert
```

> ⚠️ **Important:** `--upsert` overwrites the `status` field back to `pending`
> for matching rows. If you want to preserve send-status across re-imports,
> use `--default` (the no-flag default) which inserts only genuinely new
> emails and leaves existing rows untouched:
>
> ```bash
> python3 -m marketing_outreach.load_to_mongo \
>     --input marketing_outreach/data/Hospital_Contact_Detail_V2.xlsx
> ```

#### C · Filtered import (US-only, verified emails only)

```bash
python3 -m marketing_outreach.load_to_mongo \
    --input marketing_outreach/data/Hospital_Contact_Detail_V2.xlsx \
    --country US \
    --email-status Verified \
    --replace
```

### What the loader actually does

1. **Parses** XLSX (via `openpyxl`) or CSV (via Python's stdlib).
2. **Skips** rows with no `Email` column value.
3. **Normalises** country names → 2-letter codes (`US`, `UK`, `IN`, `EU`, `IL`…).
4. **Flattens** Apollo's 25+ columns into a stable BioMedMeet schema (see table below).
5. **Creates indexes** on `contact_email` (unique), `country`, `status`.
6. **Stamps** every new row with:
   - `status: "pending"`
   - `last_attempt_at: null`
   - `last_error: null`
   - `imported_at: <utc-now>`
7. **Dedupes** on `contact_email` before bulk-insert (Apollo exports often contain dupes).
8. **Prints a summary** at the end: total rows, breakdown by country, breakdown by status.

### Schema of a `marketing_contacts` document

| Field | Source | Notes |
|---|---|---|
| `_id` | Mongo | ObjectId, never appears in your campaign emails. |
| `contact_email` | Apollo `Email` | **Unique** index. Lowercased. Primary key. |
| `contact_first_name` | Apollo `First Name` | Used as merge field in the subject + greeting. |
| `contact_person` | Synthesised | `"First Last"`. |
| `hospital_name` | Apollo `Company Name` | Used in subject + body. |
| `digital_team_name` | Apollo `Title` (falls back to `Departments`) | Used as the "<your title> team" phrase. |
| `country` | Apollo country, normalised | `US` / `UK` / `IN` / `EU` / other 2-letter. |
| `status` | Generated | `pending` → `sent` → (or `failed` / `bounced` / `unsubscribed`). **This is the field send_campaign.py uses to know who's next.** |
| `last_attempt_at` | Generated | UTC datetime stamped when send_campaign touched the row. |
| `last_error` | Generated | Last SMTP error text, truncated to 500 chars. |
| `imported_at` | Generated | UTC datetime of the loader run. |
| `phone`, `linkedin_url`, etc. | Apollo | Preserved verbatim; not used by the default email template. |

### Verifying the load worked

```bash
# Open a quick Mongo shell (no auth needed for local Mongo)
mongosh biomedmeet_marketing --quiet --eval '
  print("Total:", db.marketing_contacts.countDocuments({}));
  print("By country:");
  db.marketing_contacts.aggregate([
    {$group: {_id: "$country", n: {$sum: 1}}},
    {$sort: {n: -1}}
  ]).forEach(d => print("  " + d._id + ":\t" + d.n));
  print("By status:");
  db.marketing_contacts.aggregate([
    {$group: {_id: "$status", n: {$sum: 1}}}
  ]).forEach(d => print("  " + d._id + ":\t" + d.n));
'
```

---

## 3 · Daily campaign run — how the resume actually works

> **TL;DR:** there is no "day 2 cursor" you have to remember. The script
> queries `status: "pending"` only, flips each row to `sent` immediately
> after a successful SMTP delivery, and stops at `--daily-cap`. Next day,
> re-run the same command — Mongo serves the next batch of `pending` rows
> automatically.

### Day 1

```bash
cd ~/Project_Gen_AI-Hospital-General-Meeting-App
source venv/bin/activate

python3 -m marketing_outreach.send_campaign \
    --country US \
    --send \
    --daily-cap 100
```

What happens behind the scenes:

1. Connects to `biomedmeet_marketing.marketing_contacts`.
2. Runs this Mongo query (see `send_campaign.py` line 116):
   ```javascript
   {
     country: "US",
     status: { $in: ["pending", null] },
     contact_email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/
   }
   ```
3. Iterates rows. For each:
   - Sends the email via SMTP.
   - **Immediately** updates that row: `status: "pending"` → `"sent"` + stamps `last_attempt_at`.
   - Sleeps `PER_EMAIL_PAUSE` seconds (default 4s) to protect sender reputation.
4. After 100 successful sends, the loop hits `if sent >= args.daily_cap:` and stops.
5. Writes a per-run CSV to `marketing_outreach/_runs/YYYYMMDDTHHmmssZ_us.csv`
   with one row per contact processed (sent / failed / skipped / dry-run).

### Day 2 (and every day after)

**The same command picks up exactly where Day 1 left off.** Nothing to remember:

```bash
python3 -m marketing_outreach.send_campaign \
    --country US \
    --send \
    --daily-cap 100
```

Why? Because:

- Day 1's 100 contacts are now `status: "sent"` in Mongo.
- The Day 2 query (`status: {$in: ["pending", null]}`) **excludes them automatically**.
- Mongo returns the next 100 still-pending rows.

### Worked example

After Day 1 your `marketing_contacts.status` looks like:

| status | count |
|---|---|
| sent | 100 |
| pending | 1,234 |
| failed | 3 |

After Day 2:

| status | count |
|---|---|
| sent | 200 |
| pending | 1,134 |
| failed | 5 |

After Day 17 (you've drained the pending pool):

| status | count |
|---|---|
| sent | 1,694 |
| pending | 0 |
| failed | 43 |

Now the script prints `Contacts to process: 0` and exits cleanly. **No risk
of double-sending** — `sent` rows are filtered out of every subsequent query.

### Verifying mid-campaign

```bash
mongosh biomedmeet_marketing --quiet --eval '
  print("Pending US:", db.marketing_contacts.countDocuments({country:"US", status:"pending"}));
  print("Sent US:",    db.marketing_contacts.countDocuments({country:"US", status:"sent"}));
  print("Failed US:",  db.marketing_contacts.countDocuments({country:"US", status:"failed"}));
'
```

Or look at the run log:

```bash
ls -lt marketing_outreach/_runs/ | head -10
```

Each run is a separate `.csv` with the per-contact outcome.

---

## 4 · Handling failures, retries, and unsubscribes

### Retry failed sends

After a deliverability blip, you might want to retry contacts whose row is
now `status: "failed"`. Flip them back to `pending`:

```bash
# Retry all failed US contacts
mongosh biomedmeet_marketing --quiet --eval '
  const r = db.marketing_contacts.updateMany(
    { country: "US", status: "failed" },
    { $set: { status: "pending", last_error: null } }
  );
  print("Reset", r.modifiedCount, "rows back to pending");
'
```

Then re-run the normal `send_campaign` command — those rows will be picked up
again on the next cycle.

### Mark bounces

If you get bounce notifications, mark those addresses so they're never retried:

```bash
mongosh biomedmeet_marketing --quiet --eval '
  db.marketing_contacts.updateOne(
    { contact_email: "bouncy@oldhospital.example" },
    { $set: { status: "bounced", last_error: "smtp 550 user unknown" } }
  );
'
```

### Mark unsubscribes

Bake this into your operating procedure — when someone replies "unsubscribe":

```bash
mongosh biomedmeet_marketing --quiet --eval '
  db.marketing_contacts.updateOne(
    { contact_email: "principled.cio@hospital.example" },
    { $set: { status: "unsubscribed" } }
  );
'
```

Any `status` other than `"pending"` / `null` is excluded from future runs.

---

## 5 · Safety checklist before every send

1. **Dry-run preview first** to eyeball the HTML one last time:
   ```bash
   python3 -m marketing_outreach.send_campaign --country US --limit 3
   # Look at the rendered files in marketing_outreach/_runs/preview/
   ```
2. **Test send to yourself** with multi-recipient override:
   ```bash
   python3 -m marketing_outreach.send_campaign --country US --limit 1 \
       --override-recipient you@gmail.com,colleague@gmail.com --send
   ```
3. **Check inbox placement** — open the test message → Show original →
   confirm `SPF: PASS · DKIM: PASS · DMARC: PASS`.
4. **Then run the real campaign** with the daily cap:
   ```bash
   python3 -m marketing_outreach.send_campaign --country US --send --daily-cap 100
   ```

---

## 6 · Warm-up schedule (first 2 weeks of any new sender domain)

A brand-new Google Workspace mailbox has zero reputation. Don't blast 1,700
emails on day 1 — Gmail will quietly throttle you.

| Day | `--daily-cap` |
|-----|---------------|
| 1–2 | 10–20 |
| 3–5 | 30–50 |
| 6–10 | 80–100 |
| 11+ | 200–300 |

Pass the cap explicitly each day:

```bash
python3 -m marketing_outreach.send_campaign --country US --send --daily-cap 20
# ...
python3 -m marketing_outreach.send_campaign --country US --send --daily-cap 50
# ...
python3 -m marketing_outreach.send_campaign --country US --send --daily-cap 100
```

---

## 7 · Reference: the full `send_campaign.py` CLI

```
--country US|EU|UK|IN          Required. Selects rows from Mongo by country.
--source mongo|csv|xlsx        Default mongo. csv/xlsx is for one-off blasts.
--input <path>                 Required when --source=csv|xlsx.
--limit <int>                  Cap the number of rows pulled from Mongo (testing).
--daily-cap <int>              Hard stop after N successful sends. Default 300.
--per-email-pause <int>        Seconds between sends. Default 4.
--send                         WITHOUT this flag, the script does a dry-run
                               (renders to _runs/preview/ but sends nothing).
--override-recipient a,b,c     Comma-separated test addresses. Real recipient
                               from Mongo is replaced; SELF_BCC is skipped.
```

---

## 8 · Common mistakes (and how to recover)

| Problem | What happened | Recovery |
|---|---|---|
| Same contact emailed twice. | You re-imported with `--replace` mid-campaign, resetting everyone's `status` back to `pending`. | Next time use the default loader (no `--replace`, no `--upsert`) — it inserts only genuinely new emails. |
| Campaign sent zero emails. | All rows had `status: "sent"` already, or `country` filter didn't match. | Check `mongosh ... countDocuments({country:"US", status:"pending"})`. |
| Got an SMTP `535` auth error. | Wrong app password (or you forgot to enable 2-Step Verification on the mailbox). | Re-generate the app password at `myaccount.google.com/apppasswords` and update `marketing_outreach/.env`. |
| Emails landing in spam. | DKIM / SPF / DMARC not configured for `biomedmeet.com`. | Follow `/app/docs/EMAIL_SENDER_SETUP_BIOMEDMEET.md` end-to-end. |
| `_bcc_recipients` AttributeError. | You're running the old version. | `git pull origin main`. |
