# BioMedMeet — Production Email Sender Setup (`demo@biomedmeet.com`)

> One-time setup guide to send privacy-compliant, DKIM-signed marketing emails
> from `demo@biomedmeet.com` via Google Workspace + Cloudflare DNS, then run the
> standalone outreach pipeline in `/marketing_outreach/`.

---

## 0. Why this matters

Hospital mail servers (Exchange, Mimecast, Proofpoint, Barracuda) **silently
drop** B2B cold email that fails any of:

- **SPF** — sender IP allowed to send on behalf of the domain
- **DKIM** — message body cryptographically signed by the domain
- **DMARC** — policy that ties SPF/DKIM results to the visible `From:` address

If `SENDER_EMAIL` uses `biomedmeet.com` but the message is signed only by
`gmail.com`, DMARC fails → message goes to spam or is rejected outright. The
setup below fixes that.

---

## 1. Google Workspace mailbox

1. Sign in to <https://admin.google.com> as a Workspace super-admin.
2. **Directory → Users → Add new user**
   - First name: `Demo`
   - Last name: `BioMedMeet`
   - Primary email: `demo@biomedmeet.com`
   - Temporary password → save.
3. Sign in once as `demo@biomedmeet.com` at <https://mail.google.com>, accept ToS.
4. **Manage Account → Security → 2-Step Verification → turn ON** (required for app passwords).
5. **Manage Account → Security → App Passwords**
   - App: `Mail`
   - Device: `Other (BioMedMeet outreach)`
   - Click **Generate** → copy the 16-character password (e.g. `abcd efgh ijkl mnop`).
   - **Save it once — Google won't display it again.**

⚠️ **Rotate any previously-leaked Gmail App Password.** Old keys can be revoked at
<https://myaccount.google.com/apppasswords>.

---

## 2. DNS records in Cloudflare for `biomedmeet.com`

> Cloudflare DNS panel → **biomedmeet.com → DNS → Records**
> Cloudflare propagation is usually <5 min when the domain is on its nameservers.

### 2.1 MX (Google delivery)
Already set if Workspace receives mail. Confirm with `dig +short MX biomedmeet.com`.

### 2.2 SPF — TXT at `@`
| Field | Value |
|---|---|
| Type | `TXT` |
| Name | `@` |
| Content | `v=spf1 include:_spf.google.com ~all` |
| TTL | `Auto` |

> ⚠️ Only **one** SPF record per domain. If another `v=spf1` exists, merge them
> into one line (e.g. `v=spf1 include:_spf.google.com include:mailgun.org ~all`).

### 2.3 DKIM — TXT at `google._domainkey`
1. In Google Admin: **Apps → Google Workspace → Gmail → Authenticate email**
2. Select domain `biomedmeet.com`, **2048-bit** key length → **Generate new record**.
3. Use the in-page **Copy** button next to the TXT value (avoid copying the label).
4. Add to Cloudflare:

| Field | Value |
|---|---|
| Type | `TXT` |
| Name | `google._domainkey` ← note the dot before `_domainkey` |
| Content | the long `v=DKIM1; k=rsa; p=...` string — **nothing before `v=DKIM1`** |
| TTL | `Auto` |

#### Common DKIM pitfalls
| ❌ Wrong | ✅ Right |
|---|---|
| Name: `google_domainkey` | Name: `google._domainkey` |
| Content: `"TXT record value:\010v=DKIM1; ..."` | Content: `v=DKIM1; k=rsa; p=MIIB...QIDAQAB` |
| Surrounding double-quotes | No quotes (Cloudflare adds them) |
| Line breaks inside the key | One continuous string |

### 2.4 DMARC — TXT at `_dmarc`
Start permissive, tighten later.

| Field | Value |
|---|---|
| Type | `TXT` |
| Name | `_dmarc` |
| Content | `v=DMARC1; p=none; rua=mailto:demo@biomedmeet.com; fo=1` |
| TTL | `Auto` |

After 1–2 weeks of clean reports, upgrade to `p=quarantine`, then `p=reject`.

---

## 3. Verify DNS

From your Ubuntu server (or any terminal with `dig`):

```bash
dig +short TXT biomedmeet.com
dig +short TXT google._domainkey.biomedmeet.com
dig +short TXT _dmarc.biomedmeet.com
```

Pass criteria:

- **SPF:** exactly one line containing `v=spf1 include:_spf.google.com ~all`
- **DKIM:** **starts with** `v=DKIM1;` and **ends with** `QIDAQAB` (Cloudflare may split into two quoted chunks — that's fine)
- **DMARC:** starts with `v=DMARC1;`

Online double-check (no terminal needed):
- <https://mxtoolbox.com/spf.aspx>
- <https://mxtoolbox.com/dkim.aspx> → selector `google`
- <https://mxtoolbox.com/dmarc.aspx>

---

## 4. Activate DKIM in Google Admin

Once `dig` shows a clean `v=DKIM1; ... QIDAQAB`:

1. **Admin Console → Apps → Google Workspace → Gmail → Authenticate email**
2. Click **Start Authentication**.
3. Status should flip to **Authenticating email with DKIM** (green) within ~1 minute.

If still red after 5 min, re-run the `dig` checks above — the TXT record is the
only thing Google looks at.

---

## 5. Update `/app/marketing_outreach/.env`

```env
# SMTP — Google Workspace
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=demo@biomedmeet.com
SMTP_PASSWORD=abcdefghijklmnop          # 16-char app password; spaces OK (script strips them)

# Sender identity (must match SMTP_USER's domain for DKIM/DMARC alignment)
SENDER_NAME=BioMedMeet Team
SENDER_EMAIL=demo@biomedmeet.com
SENDER_POSTAL_ADDRESS=<your registered business address>   # CAN-SPAM requirement

# Privacy / behaviour
SELF_BCC=                                # leave empty — operator does NOT need a copy of every send
DAILY_CAP=50                             # warm-up gently
PER_EMAIL_PAUSE=4                        # seconds between sends — protects sender reputation

# Marketing DB
MARKETING_DB_URL=mongodb://localhost:27017
MARKETING_DB_NAME=biomedmeet_marketing
```

Restart any active venv shell so the new env loads.

---

## 6. Warm-up schedule (critical for cold outreach)

A brand-new Workspace mailbox has **zero reputation**. Send 1,700 emails on day
one and Google will throttle/block you.

| Day | Volume | Notes |
|---|---|---|
| 1–2 | 10–20 | only inboxes you control (yourself, teammates) |
| 3–5 | 30–50 | early friendly recipients |
| 6–10 | 80–100 | first real prospect batch |
| 11+ | 200–300 | full daily cap |

Monitor open / bounce / spam-complaint rates. If bounce rate >5% or complaints >0.1%, pause.

---

## 7. Test send (do this first)

```bash
cd ~/Project_Gen_AI-Hospital-General-Meeting-App
git pull origin main
source venv/bin/activate

# Dry run — renders HTML to _runs/preview/, sends nothing
python -m marketing_outreach.send_campaign --country US --limit 1

# Live test to YOUR inboxes (no contact in Mongo gets touched)
python -m marketing_outreach.send_campaign --country US --limit 1 \
    --override-recipient shalini.vishwakarma@gmail.com,Nirajkv@gmail.com --send
```

### What you should see in Gmail
Open the test message → **⋮ menu → Show original** → confirm:

```
SPF:    PASS with IP ...
DKIM:   PASS with domain biomedmeet.com
DMARC:  PASS
```

Three PASS = you are cleared for warm-up.

---

## 8. Launch the real campaign

```bash
# Load Apollo / ZoomInfo export into Mongo (one-time per export)
python -m marketing_outreach.load_to_mongo \
    --input marketing_outreach/data/Hospital_Contact_Detail_V2.xlsx --replace

# Send — start with day-1 cap
python -m marketing_outreach.send_campaign --country US --send --daily-cap 20

# Subsequent days, after monitoring deliverability
python -m marketing_outreach.send_campaign --country US --send --daily-cap 50
python -m marketing_outreach.send_campaign --country US --send --daily-cap 100
```

Each run writes `_runs/<timestamp>_us.csv` with per-contact status, and updates
Mongo (`pending → sent / failed`) so the next run resumes cleanly.

---

## 9. Privacy guarantees (do not regress)

The script enforces these — verified in code at
`/app/marketing_outreach/send_campaign.py`:

1. `To:` header → `Undisclosed Recipients <demo@biomedmeet.com>` (never the contact's email).
2. Real recipient is in **envelope BCC only** (passed to `send_message(to_addrs=...)`).
3. Footer HTML/text contains **no** dynamic recipient email or recipient name.
4. When `--override-recipient` is used, `SELF_BCC` is **not** appended (no leaks to operator's other inboxes).

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Google Admin "Email authentication was not verified" | DKIM TXT not resolving cleanly | Re-check `dig +short TXT google._domainkey.biomedmeet.com`; must start with `v=DKIM1;` |
| Test email never arrives | DMARC failing → silent quarantine | Open Gmail "Show original", check SPF/DKIM/DMARC verdicts |
| Override sends only to first email of comma list | Old `send_campaign.py` bug | Fixed in current code (`msg._bcc_recipients = list(to_addrs)`); pull latest |
| `SMTPAuthenticationError 535` | App password wrong / 2-Step Verification off | Regenerate app password; confirm 2SV is ON |
| Gmail drops you into Promotions tab | Marketing-style HTML is expected to land there for personal Gmail recipients | Fine — corporate Outlook/Exchange receivers will see Inbox normally |

---

## 11. Quick reference card

```text
Sender mailbox:      demo@biomedmeet.com  (Google Workspace)
SMTP host/port:      smtp.gmail.com / 587 (STARTTLS)
SMTP user:           demo@biomedmeet.com
SMTP password:       <16-char app password>
SENDER_EMAIL:        demo@biomedmeet.com
DNS — SPF:           @                   TXT  v=spf1 include:_spf.google.com ~all
DNS — DKIM:          google._domainkey   TXT  v=DKIM1; k=rsa; p=...QIDAQAB
DNS — DMARC:         _dmarc              TXT  v=DMARC1; p=none; rua=mailto:demo@biomedmeet.com; fo=1
Test command:        python -m marketing_outreach.send_campaign --country US --limit 1 \
                         --override-recipient you@gmail.com --send
Production command:  python -m marketing_outreach.send_campaign --country US --send --daily-cap 50
```
