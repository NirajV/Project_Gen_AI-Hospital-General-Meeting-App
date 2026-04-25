# Hospital General Meeting Scheduler (MedMeet) - PRD

## Original Problem Statement
Web-based Hospital General Meeting Scheduler App for healthcare professionals. Deployed via Docker on local LAN (192.168.40.231).

## Architecture
- Frontend: React 19 + Tailwind + shadcn/ui
- Backend: FastAPI (Python)
- DB: MongoDB
- Auth: JWT + Google OAuth (Emergent Auth)
- Deployment: Docker Compose on user's LAN server

## Core Features Implemented
1. JWT auth + Google OAuth
2. Patient CRUD (14 fields incl. MRN, gender)
3. Meeting wizard (4 steps), CRUD, Case Room (5 tabs)
4. File upload, decision logging, agenda checklist with treatment plans
5. MS Teams link generation (code complete; blocked on Azure policy propagation)
6. Email reminder scheduler (1h before, deduplicated)
7. PDF meeting summary export at `GET /api/meetings/{id}/summary` (working end-to-end)

## MS Teams Integration Status
- Code: complete and tested. Non-blocking; 503 if not configured, 502 on Graph errors.
- Azure: admin consent granted for `OnlineMeetings.ReadWrite.All`; `Grant-CsApplicationAccessPolicy` for `HospitalMeetingAppPolicy` ran. Awaiting Microsoft propagation (up to 24h).

## Email Scheduler (Apr 2026)
- `/app/backend/scheduler.py` — in-process asyncio task in FastAPI lifespan
- 1h-before reminders only, polled every 5 min, deduped via `reminder_1h_sent` flag

## Frontend Modular Architecture (Apr 2026)
- `MeetingDetailPage.js`: 2,449 → 1,802 lines (-647, -26%)
- New `/app/frontend/src/components/meeting/`:
  - OverviewTab.js, PatientsTab.js, AgendaTab.js, FilesTab.js, DecisionsTab.js
- Shared utils in `/app/frontend/src/lib/`:
  - treatmentPlanUtils.js (7-day edit window helpers)
  - meetingColors.js (rotating card palette)
- Tested 100% pass (iter 11 + 12)

## Prioritized Backlog
### P0 (External Block)
- [ ] Wait for MS Teams policy propagation; verify meeting creation generates link

### P2 (Done — Apr 2026)
- [x] Complete tab extraction (Overview, Patients, Agenda)
- [x] PDF meeting summary export — verified

### P2 (In Progress)
- [ ] Calendar Integration: Outlook + Google (chosen by user; needs scope decisions before implementation)

### P2 (Pending)
- [ ] Further refactor: extract dialogs (EditDateTime, Upload, PatientAdd, AgendaAdd) and useMeetingDialogs hook → bring MeetingDetailPage.js < 1000 lines
- [ ] UX hint when adding agenda with no non-organizer participants
- [ ] Cloud file storage migration

### P3
- [ ] AI summary generation
- [ ] PACS/EMR integration
- [ ] Migrate naive-local meeting_date/start_time to UTC datetimes

## Critical Notes for Future Agents
- User on Docker LAN; .env or requirements.txt change ⇒ `sudo docker-compose up -d --build`
- docker-compose.yml uses explicit `environment:` block — add new env vars there
- meeting_date/start_time stored as naive local strings — scheduler depends on this
