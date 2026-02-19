# Hospital General Meeting Scheduler (MedMeet) - Product Requirements Document

## Original Problem Statement
Web-based Hospital General Meeting Scheduler App for healthcare professionals to organize and conduct case meetings.

## Architecture & Tech Stack
- **Frontend**: React 19 with Tailwind CSS, shadcn/ui components
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (originally planned MySQL - adapted for environment)
- **Authentication**: JWT-based auth + Google OAuth via Emergent Auth

## User Personas
1. **Organizer Doctor**: Creates meetings, selects patients, defines agenda, sends invites
2. **Invited Doctors**: Receive invites, review patient info, upload reports, join meetings
3. **Admin Staff** (Future): Help set up meetings, manage participants

## Core Requirements
### Implemented ✅
1. **Authentication**
   - JWT-based email/password registration & login
   - Google OAuth integration via Emergent Auth
   - Protected routes with session management

2. **Dashboard**
   - Upcoming meetings count
   - Meetings this week
   - Pending invites
   - Total patients
   - Quick access to upcoming meetings list

3. **Patient Management**
   - Create/Edit/Delete patients
   - Patient demographics (name, DOB, gender, contact)
   - Medical info (diagnosis, allergies, medications)
   - Department & provider information
   - Patient search functionality

4. **Meeting Management**
   - 4-step meeting wizard (Info → Participants → Patients → Agenda)
   - Meeting types: Video, In-Person, Hybrid
   - Teams video link support (manual entry)
   - Recurrence options (one-time, daily, weekly, monthly)

5. **Case Room (Meeting Detail)**
   - Overview tab with meeting details
   - Patients tab with case info
   - Agenda tab with checklist items
   - Files tab with upload capability
   - Decisions tab for logging outcomes

6. **Meeting Invites**
   - Accept/Decline/Tentative responses
   - Participant management

### Deferred for Later Phase
- Email notifications (SMTP configured but not implemented)
- Auto-generated meeting summaries
- PACS/EMR integration
- Cloud file storage (currently local)
- Real-time collaboration features

## What's Been Implemented (Feb 19, 2026)
- [x] Complete backend API with MongoDB
- [x] User authentication (JWT + OAuth)
- [x] Patient CRUD operations
- [x] Meeting CRUD with wizard flow
- [x] Case Room with 5 tabs
- [x] File upload functionality
- [x] Decision logging
- [x] Agenda management
- [x] Dashboard with statistics
- [x] Responsive UI with Clinical Zen theme

## API Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - JWT login
- `POST /api/auth/session` - OAuth session processing
- `GET /api/auth/me` - Current user
- `GET /api/users` - List doctors
- `GET/POST /api/patients` - Patient list & create
- `GET/PUT/DELETE /api/patients/{id}` - Patient detail
- `GET/POST /api/meetings` - Meeting list & create
- `GET/PUT/DELETE /api/meetings/{id}` - Meeting detail
- `PUT /api/meetings/{id}/respond` - Invite response
- `POST /api/meetings/{id}/files` - File upload
- `POST /api/meetings/{id}/decisions` - Log decision
- `GET /api/dashboard/stats` - Dashboard metrics

## Prioritized Backlog
### P0 (Critical)
- [x] Core authentication flow
- [x] Basic meeting creation
- [x] Patient management

### P1 (High Priority)
- [ ] Email notifications for invites
- [ ] Meeting reminders
- [ ] Export meeting summary to PDF

### P2 (Medium Priority)
- [ ] Cloud file storage migration
- [ ] Calendar integration (Outlook/Google)
- [ ] Real-time meeting notes

### P3 (Nice to Have)
- [ ] AI-powered meeting summary generation
- [ ] PACS/EMR integration
- [ ] Mobile-responsive optimization

## Next Tasks
1. Implement email notifications via SMTP
2. Add meeting summary export
3. Calendar integration
4. Performance optimization
