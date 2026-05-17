# BioMedMeet — Hospital Case Meeting Scheduler

A production-ready, time-zone-aware web application for planning, running, and
documenting hospital multidisciplinary case meetings (tumour boards, MDTs, case
conferences) with built-in Microsoft Teams, calendar invites, patient cards,
agenda items, decisions, treatment plans, and an automatic-reminder scheduler.

> **Public marketing site:** <https://biomedmeet.com/home/>
> **Application:** <https://biomedmeet.com/>

---

## Tech stack

| Layer       | Stack                                                     |
| ----------- | --------------------------------------------------------- |
| Frontend    | React 18 (CRA), React Router 6, Tailwind, shadcn/ui, axios |
| Backend     | FastAPI, Pydantic, motor (async MongoDB), uvicorn          |
| Database    | MongoDB (single replica set or standalone)                 |
| Integrations| Microsoft Graph (Teams), Gmail / SMTP, .ics RFC-5545       |
| Deployment  | Docker Compose (frontend + backend + mongo), nginx        |

---

## Quick deploy (production / LAN host)

```bash
git clone <your-fork> biomedmeet && cd biomedmeet

# 1. Populate the ROOT .env (next to docker-compose) — NOT backend/.env.
#    Docker Compose substitutes ${VAR} values from this file at build/run time.
cp .env.example .env
$EDITOR .env   # fill in MONGO_URL, SMTP_*, GRAPH_*, etc.

# 2. Build + start
sudo docker compose up -d --build

# 3. Visit
#    https://biomedmeet.com/          → application login
#    https://biomedmeet.com/home/     → marketing site
#    https://biomedmeet.com/api/health → expects 200
```

For the full reproducible recipe, see [`docs/TECHNICAL_RECREATION_PROMPT.md`](./docs/TECHNICAL_RECREATION_PROMPT.md).

---

## Local development (without Docker)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend (new terminal)
cd frontend
yarn install
yarn start          # http://localhost:3000
```

---

## Feature highlights

- **4-step meeting wizard** — title, participants, patients, agenda
- **One-click Microsoft Teams meeting** — generated & auto-rescheduled via Graph
- **Time-zone-aware invites** — recipients see local time in body, `.ics`, and UI
- **Holiday-aware scheduling** — US, UK, India defaults + per-hospital custom days
- **Patient cards & approval workflow** — first-class patient records, organiser approval
- **Decisions & treatment plans** — versioned, audited, 7-day post-meeting edit window
- **File attachments** — radiology / pathology / lab / consult notes, tagged by type
- **Automatic 1-hour reminder** — deduplicated background job
- **Auto-complete meetings** — flip to "completed" 10 min after end (configurable)
- **Lead capture marketing site** — public `/home/` with demo-request + gated cheat-sheet
- **Authenticated file downloads** — Blob-URL flow keeps `/api/files/*` protected by Bearer auth

---

## Repository layout

```
.
├── backend/                FastAPI app
│   ├── core/               settings & wiring
│   ├── models/             pydantic schemas
│   ├── routes/             (some routes live in server.py — see CHANGELOG for ongoing split)
│   ├── services/           teams_service.py, pdf services
│   ├── templates/emails/   Jinja HTML for invite / reminder / digest / response-change / account-setup
│   ├── utils/              email, ics_builder, timezone_utils, holiday_checker, pdf_generator
│   ├── tests/              pytest regression suite
│   ├── scheduler.py        background reminder + auto-complete loop
│   └── server.py           FastAPI app + routes
├── frontend/
│   ├── public/
│   │   ├── home/           static marketing site (BioMedMeet.com/home/)
│   │   └── docs/           public PDFs (BioMedMeet_CheatSheet.pdf)
│   ├── src/
│   │   ├── components/     UI + shadcn primitives + meeting / profile / help
│   │   ├── pages/          MeetingDetailPage, MeetingWizardPage, ProfilePage, etc.
│   │   ├── context/        AuthContext (JWT, optional Google OAuth)
│   │   └── lib/            api client, regional data, locale detection, helpers
│   ├── nginx.conf          Docker frontend nginx (SPA fallback + /api proxy)
│   └── Dockerfile
├── scripts/
│   └── generate_cheatsheet_pdf.py   reportlab generator for the gated PDF
├── docs/                   topic-specific reference docs (see below)
├── memory/                 PRD + test credentials (used by automated agents)
├── docker-compose.yml      Docker stack: mongo + backend + frontend
└── nginx.conf              (optional reverse-proxy in front of the stack)
```

---

## Documentation index

| Doc                                                | What's in it                                      |
| -------------------------------------------------- | ------------------------------------------------- |
| [`SETUP.md`](./SETUP.md)                           | Step-by-step first-time setup                     |
| [`docs/TECHNICAL_RECREATION_PROMPT.md`](./docs/TECHNICAL_RECREATION_PROMPT.md) | **Full prompt to recreate the app from scratch** |
| [`docs/CHANGELOG.md`](./docs/CHANGELOG.md)         | Dated change log                                  |
| [`docs/FEATURES.md`](./docs/FEATURES.md)           | User-facing feature list                          |
| [`docs/API_REFERENCE.md`](./docs/API_REFERENCE.md) | Backend route reference                           |
| [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)       | Production deploy (Docker, Cloudflare tunnel)     |
| [`docs/TEAMS_INTEGRATION.md`](./docs/TEAMS_INTEGRATION.md) | Microsoft Entra app + Graph permissions    |
| [`docs/EMAIL_INTEGRATION.md`](./docs/EMAIL_INTEGRATION.md) | SMTP / Gmail App Password setup            |
| [`docs/TIMEZONE_CONFIGURATION.md`](./docs/TIMEZONE_CONFIGURATION.md) | TZ data model & rendering rules      |
| [`docs/HOLIDAY_CALENDAR.md`](./docs/HOLIDAY_CALENDAR.md) | Holiday packs + per-user customisation     |
| [`docs/PATIENT_APPROVAL_SYSTEM.md`](./docs/PATIENT_APPROVAL_SYSTEM.md) | Non-organiser → organiser approval flow |
| [`memory/PRD.md`](./memory/PRD.md)                 | Long-form product requirements + ongoing roadmap  |

---

## License

Proprietary. Contact <Niraj.k.vishwakarma@gmail.com> for licensing.
