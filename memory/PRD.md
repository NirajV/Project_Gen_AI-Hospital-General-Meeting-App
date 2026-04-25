# Hospital General Meeting Scheduler (MedMeet) - Product Requirements Document

## Original Problem Statement
Web-based Hospital General Meeting Scheduler App for healthcare professionals. Deployed via Docker on local LAN (192.168.40.231).

## Architecture & Tech Stack
- Frontend: React 19 + Tailwind + shadcn/ui
- Backend: FastAPI (Python)
- DB: MongoDB
- Auth: JWT + Google OAuth (Emergent Auth)
- Deployment: Docker Compose on user's LAN server

## Core Features Implemented
1. JWT auth + Google OAuth
2. Patient CRUD (14 fields incl. MRN, gender)
3. Meeting wizard (4 steps), CRUD, Case Room (5 tabs)
4. File upload, decision logging, agenda checklist
5. MS Teams link generation (code complete, blocked on Azure policy propagation)
6. Email reminder scheduler (1h before, deduplicated)

## Microsoft Teams Integration Status
- Code state: complete and tested. Non-blocking; 503 if not configured, 502 on Graph errors.
- Azure state: admin consent granted for `OnlineMeetings.ReadWrite.All`; `Grant-CsApplicationAccessPolicy` for `HospitalMeetingAppPolicy` ran but cache still empty. Awaiting Microsoft propagation (up to 24h).

## Email Scheduler (NEW Apr 2026)
- `/app/backend/scheduler.py` — in-process asyncio task in FastAPI lifespan
- Polls every 5 min, dispatches reminders for meetings starting in 50-70 min
- Dedupes via `reminder_1h_sent: True` flag on the meeting doc
- Toggle: `EMAIL_REMINDERS_ENABLED` env var (default true)

## Frontend Refactor (Apr 2026)
- MeetingDetailPage.js: 2449 -> 2275 lines
- Extracted: FilesTab.js, DecisionsTab.js, treatmentPlanUtils.js
- Tested 100% pass

## Prioritized Backlog
### P0 (External Block)
- [ ] Wait for MS Teams policy propagation, then verify meeting creation generates link

### P1 (Done)
- [x] Email scheduler
- [x] MeetingDetailPage initial refactor

### P2
- [ ] Extract OverviewTab, PatientsTab, AgendaTab from MeetingDetailPage.js
- [ ] Admin Staff role
- [ ] Calendar integration
- [ ] Cloud file storage
- [ ] Server-side PDF summary export

### P3
- [ ] AI summary generation
- [ ] PACS/EMR integration
- [ ] Migrate meeting_date/start_time to UTC datetimes

## Critical Notes for Future Agents
- User on Docker LAN; .env or requirements.txt change => `sudo docker-compose up -d --build`
- docker-compose.yml uses explicit `environment:` block — add new env vars there
- User uploads error screenshots; ask for copy-pasted log text
- meeting_date/start_time are naive local strings (user input). Scheduler depends on this consistency.
