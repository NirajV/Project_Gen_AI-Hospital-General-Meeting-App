# Hospital General Meeting Scheduler (MedMeet) - Product Requirements Document

## Original Problem Statement
Web-based Hospital General Meeting Scheduler App for healthcare professionals to organize and conduct case meetings. Deployed via Docker on a local LAN server (192.168.40.231).

## Architecture & Tech Stack
- **Frontend**: React 19 with Tailwind CSS, shadcn/ui components
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT-based auth + Google OAuth via Emergent Auth
- **Deployment**: Docker Compose on user's LAN server

## User Personas
1. **Organizer Doctor**: Creates meetings, selects patients, defines agenda, sends invites
2. **Invited Doctors**: Receive invites, review patient info, upload reports, join meetings
3. **Admin Staff** (Future): Help set up meetings, manage participants

## Core Features Implemented
1. JWT auth + Google OAuth (Emergent)
2. Patient CRUD (14 fields incl. MRN, gender)
3. Meeting wizard (4 steps), CRUD, Case Room
4. File upload, decision logging, agenda checklist
5. Microsoft Teams link generation (auto on meeting creation, manual via endpoint) — **partially working, blocked on Azure tenant config**

## API Endpoints
- `POST /api/auth/register|login|session` - Auth
- `GET/POST/PUT/DELETE /api/patients` - Patients
- `GET/POST/PUT/DELETE /api/meetings` - Meetings
- `POST /api/meetings/{id}/generate-teams-link` - Generate Teams link
- `POST /api/meetings/{id}/files` - File upload
- `POST /api/meetings/{id}/decisions` - Log decision
- `GET /api/dashboard/stats` - Dashboard

## Microsoft Teams Integration Status
**Architecture**: Application-only (Client Credentials flow) via `msgraph-sdk` + `azure-identity`. Service Principal acts on behalf of `GRAPH_USER_ID` via Teams `ApplicationAccessPolicy`.

**Code state (Apr 2026)**: ✅ Working
- `services/teams_service.py` - Graph client w/ rich error logging
- `server.py` - Non-blocking on meeting creation, 503 on missing config, 502 on API errors
- `docker-compose.yml` - Forwards `GRAPH_CLIENT_ID/TENANT_ID/CLIENT_SECRET/USER_ID` to backend container

**Azure tenant state (Apr 2026)**: ❌ Blocked
- Diagnosed via live Graph call: HTTP 403 `Authorization_RequestDenied` on `/users/{id}` and HTTP 404 `UnknownError` on `/users/{id}/onlineMeetings`.
- Root cause: Application API permissions (`OnlineMeetings.ReadWrite.All`, ideally `User.Read.All`) were added in Azure AD but **admin consent was not granted**. Credentials authenticate (we get a token), but every Graph call returns 403/404.

**User action required**:
1. Azure portal → Entra ID → App registrations → [HospitalMeetingApp] → API permissions
2. Add Application permissions: `OnlineMeetings.ReadWrite.All`, `User.Read.All`
3. Click **"Grant admin consent for [tenant]"** — this is the missing step
4. Verify status column shows green checkmark "Granted for [tenant]"
5. Wait 5-10 minutes for propagation, then test
6. If still failing: re-run PowerShell `Grant-CsApplicationAccessPolicy` and wait up to 30 min

## What's Been Implemented
- [x] Complete backend API with MongoDB (Feb 2026)
- [x] User authentication (JWT + OAuth) (Feb 2026)
- [x] Patient CRUD with 14 fields incl. MRN (Feb 2026)
- [x] Meeting CRUD with wizard flow (Feb 2026)
- [x] Case Room with 5 tabs (Feb 2026)
- [x] MS Teams integration code + non-blocking error handling (Apr 2026)
- [x] docker-compose.yml passes GRAPH_* env vars to backend container (Apr 2026)

## Prioritized Backlog
### P0 (Critical, In Progress)
- [ ] **MS Teams: Azure admin consent** — user must click "Grant admin consent" in Azure portal (root cause confirmed via live Graph diagnostic)

### P1 (High Priority)
- [ ] Refactor monolithic `MeetingDetailPage.js` (>2500 lines)
- [ ] Email Scheduler activation (background reminders via supervisor + scheduler.py)

### P2 (Medium Priority)
- [ ] Admin Staff role
- [ ] Calendar Integration (Outlook/Google)
- [ ] Cloud file storage migration
- [ ] Export meeting summary to PDF

### P3 (Nice to Have)
- [ ] AI-powered meeting summary generation
- [ ] PACS/EMR integration
- [ ] Real-time collaboration features

## Critical Notes for Future Agents
- User runs everything on **local LAN Docker** (192.168.40.231). Any change to `requirements.txt` or `.env` requires `sudo docker-compose up -d --build` on their server.
- `docker-compose.yml` uses an explicit `environment:` block — any new env var must be added there too, otherwise Docker won't forward it to the container.
- User uploads error screenshots that AI can't OCR reliably — always ask for copy-pasted log text.
