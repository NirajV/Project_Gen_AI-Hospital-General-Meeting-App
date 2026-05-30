# 📝 Changelog

All notable changes to **BioMedMeet** Hospital Case Meeting Scheduler will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.6.4] - 2026-02-25 (commit pending — tag after `git push`)

### Added
- 🧮 **Interactive ROI calculator on the pricing page** (`frontend/public/home/pricing.html` + inline JS at the bottom).
  - Three sliders: hours saved per team per week (4–40, default 18), blended clinician rate (\$75–\$400/hr, default \$200), number of MDT teams (1–20, default 1).
  - Three live outputs: annual hours saved, annual savings (\$), payback period in months. Updates on every `input` event.
  - Each slider has a colour-coded accent (`accent-color`) matching the brand palette (green / olive / purple).
  - Output cards reuse the existing card aesthetic and the same three accent colours so the calculator visually slots between the static KPI cards and the bar chart.
  - Numbers clamped at the input level (min/max/step) so prospects can't produce embarrassing values. Payback shows `< 1` below one month and `24+` above two years to keep the screenshot clean for procurement decks.
  - Licence price (`$25,000`) lives in a single JS const so updating the price card later auto-updates the calculator math.
  - Verified live: `25 hrs/wk × $300/hr × 3 teams` → `3,900 hrs/yr`, `$1,170,000`, `0.3 months` payback. Math matches expected.

---

## [2.6.3] - 2026-02-25 (commit `4ad3d36`)

### Added
- 🎯 **New pricing page** at `https://biomedmeet.com/home/pricing.html` (`frontend/public/home/pricing.html`):
  - Dark-navy hero with the one-time **$25,000 + tax** perpetual licence prominently displayed.
  - 6-bullet inclusion list (on-prem Docker install, unlimited users/meetings/patients, Teams + holiday-aware calendar, decision log + treatment plans + PDF summaries, 7 walkthrough videos, 2-month warranty trial).
  - ROI section with three KPI cards: **18 hrs/week reclaimed**, **~$187,200/year clinician time saved** (at a $200/hr blended rate), **~1.6-month payback**.
  - CSS-only horizontal bar chart breaking down where the 18 hours go (scheduling, agenda prep, minute-taking, RSVP chase, follow-up emails).
  - "No SaaS strings" section: no per-user fees · no monthly recurring · no data leaves your network · no vendor lock-in.
  - Installation timeline (Week 1 Install · Week 2 Onboard · Months 1-2 Warranty trial).
  - FAQ block + dual-CTA footer (Request a demo · Email Demo@BioMedMeet.com).
- 🧭 **"Pricing" nav link** added to `frontend/public/home/assets/layout.js` (sub-pages) and `frontend/public/home/index.html` (homepage hard-coded nav). Cache-buster bumped to `?v=20260225b` on all sub-pages.
- 💬 **Persistent RSVP banner** on the meeting detail page (`frontend/src/components/meeting/RsvpBanner.js`):
  - Replaces the disappearing toast with a colour-coded banner (pending = blue, accepted = green, tentative = amber, declined = red) showing the participant's current response.
  - Three one-click action buttons (Accept · Tentative · Decline) let users change their mind without going back to the email.
  - Hidden for organizers, non-participants, and `completed`/`cancelled` meetings so the UI stays clean.
  - Calls `PUT /api/meetings/{id}/respond` and refreshes the meeting via the existing `loadMeeting()` so the participant pill list updates in lockstep.

### Verified
- Pricing page renders correctly — screenshot confirms hero + nav (with new "Pricing" link) + ROI cards all in place.
- `RsvpBanner` component: lint clean; Playwright smoke walk-through reached the banner, clicked Accept, then Decline — no JS errors; existing curl-level verification of `PUT /api/meetings/{id}/respond` from [2.6.2] still passes.

### Deployment notes for this release
```bash
git pull origin main
docker compose down
docker compose up -d --build
```

After rebuild — **purge Cloudflare cache** so visitors get the new `pricing.html` + the `?v=20260225b` `layout.js` (which carries the new "Pricing" nav link).

### Git commit tag
*To be appended after the next `git push`:*
```
git log --oneline -1 -- docs/CHANGELOG.md
# tag: <hash> by <user> on <date>
```

---

## [2.6.2] - 2026-02-25 (commit pending — tag after `git push`)

### Fixed
- 🐛 **Accept / Decline click in meeting-invite email never propagated to the app.** Root cause: when a recipient wasn't already signed in, `ProtectedRoute` correctly redirected them to `/login` while preserving the URL in `location.state.from` — but `LoginPage.js` ignored that and hard-coded `navigate('/dashboard')`. The `?action=accept` query param was lost on the bounce. Fix (`frontend/src/pages/LoginPage.js`): introduced `buildRedirectPath()` which reads `location.state.from` and reconstructs `pathname + search + hash`, then uses `navigate(..., { replace: true })` so the back button doesn't trap the user on the login screen. Verified via curl end-to-end: `pending → accepted` after `PUT /api/meetings/{id}/respond`.
- 🐛 **Marketing contact form ("Request a demo" + "Download the quick reference") + in-app feedback form were emailing `Niraj.K.Vishwakarma@gmail.com` as the default owner.** Fix (`backend/server.py`): changed the hardcoded default in both `submit_marketing_contact` (line ~1525) and `submit_feedback` (line ~1565) to `Demo@BioMedMeet.com`. Operators can still override per-deployment by setting `OWNER_EMAIL` in `backend/.env` (the user's server already has this overridden, so nothing changes for them — this only protects future deployments).

### Deployment notes for this release
After `git pull origin main`:
```bash
docker compose down
docker compose up -d --build
```
No env changes required. RSVP propagation works immediately after rebuild.

### Git commit tag
*To be appended after the next `git push`:*
```
git log --oneline -1 -- docs/CHANGELOG.md
# tag: <hash> by <user> on <date>
```

---

## [2.6.1] - 2026-02-25 (commit pending — tag after `git push`)

### Fixed
- 🐛 **Meeting-invite email links resolved to `http://localhost:3000/...`** instead of `https://biomedmeet.com/...`. Root cause: `docker-compose.yml` was not passing `FRONTEND_URL` to the backend container, so `core/config.py` fell back to the `localhost:3000` development default. Fix: `docker-compose.yml` backend `environment:` block now passes `FRONTEND_URL=${FRONTEND_URL:-https://biomedmeet.com}` so the production default is `biomedmeet.com`, overridable per `.env` file.
- 🐛 **Account-setup credentials email** "Platform URL" displayed `http://localhost:3000/home/`. Same root cause — fixed by the same `FRONTEND_URL` plumbing. **All outbound emails** (invite, reminder, datetime-change, account setup, account setup + invite, password reset, daily digest) now resolve to `https://biomedmeet.com/...` after rebuild.
- 🐛 **"Videos" nav link missing on `how-it-works.html`, `security.html`, `contact.html`** despite the container having the new `layout.js`. Root cause: Cloudflare + browsers cache `/home/assets/layout.js` indefinitely without a version string. Fix: added `?v=20260225` cache-busting query to the `<script src="/home/assets/layout.js">` tag in all three sub-pages. Forces a fresh fetch even when CF/browser cache is stale.

### Added (docker-compose env passthrough)
- `FRONTEND_URL` — public URL used in outbound email links. Default: `https://biomedmeet.com`. Override in project-root `.env` for other domains / dev.
- `AUTO_COMPLETE_ENABLED` — toggle the auto-completion sweep. Default: `true`.
- `AUTO_COMPLETE_GRACE_MINUTES` — minutes after scheduled end before auto-flipping a meeting to `completed`. Default: `120`.

### Deployment notes for this release
After `git pull origin main`:
1. (Optional) override defaults in `/root/Project_Gen_AI-Hospital-General-Meeting-App/.env`:
   ```
   FRONTEND_URL=https://biomedmeet.com
   AUTO_COMPLETE_GRACE_MINUTES=120
   ```
2. `docker compose down && docker compose up -d --build`
3. Confirm `docker compose logs backend --tail=20 | grep "Scheduler started"` shows `grace=120min`.
4. **Purge Cloudflare cache** (Caching → Configuration → Purge Everything) so visitors get the new `layout.js?v=20260225`.
5. Verify outbound emails: trigger a new meeting invite, open it, confirm Accept/Decline buttons link to `https://biomedmeet.com/meetings/...`.

### Git commit tag
*To be appended to this entry after the next `git push`:*
```
git log --oneline -1 -- docs/CHANGELOG.md
# tag: <hash> by <user> on <date>
```

---

## [2.6.0] - 2026-02-25

### Added
- **Production email sender setup** (`docs/EMAIL_SENDER_SETUP_BIOMEDMEET.md`) — full Google Workspace + Cloudflare DNS playbook for SPF / DKIM / DMARC enabling `demo@biomedmeet.com` as the deliverable sender, plus a warm-up rollout schedule.
- **Marketing campaign privacy** — `marketing_outreach/send_campaign.py` `--override-recipient` now accepts a comma-separated list of test addresses; `SELF_BCC` is skipped when overriding so test sends don't leak to the operator's other inboxes.
- **Meeting-invite RSVP via email** — Accept / Decline links in `meeting_invite.html` route to `/meetings/{id}?action=accept|decline`. The new `hooks/useRsvpFromUrl.js` (consumed by `MeetingDetailPage.js`) reads the param, calls `PUT /api/meetings/{id}/respond`, toasts confirmation, and strips the param so refresh is idempotent.
- **`AUTO_COMPLETE_GRACE_MINUTES` env var** (default **120**) — controls how long after a meeting's scheduled end the scheduler waits before auto-flipping it to `completed`. Documented in `.env.example`.

### Changed
- **`scheduler.py`** refactored: `_send_one_hour_reminders` (99 → 35 lines) and `_auto_complete_ended_meetings` (70 → 28 lines) split into focused helpers (`_parse_meeting_start`, `_send_reminder_to_participants`, `_mark_meeting_reminded`, `_organizer_timezone`, `_meeting_end_utc`, `_flip_meeting_complete`). Behaviour preserved.
- **`server.py` meeting CRUD** extracted to `services/meeting_helpers.py`:
  - `create_meeting`: **192 → 21 lines** (helpers: `validate_meeting_date_or_raise`, `build_meeting_doc`, `attach_teams_meeting`, `insert_organizer_participant`, `insert_participants_and_invite`, `insert_meeting_patients`, `insert_agenda_items`, `calculate_duration_minutes`)
  - `get_meeting_detail`: **77 → 13 lines** (helpers: `attach_organizer`, `attach_participants`, `attach_patients`, `attach_agenda`, `attach_files`, `attach_decisions`)
  - `update_meeting`: **114 → 24 lines** (helpers: `assert_can_update`, `build_update_data`, `datetime_changed`, `sync_teams_meeting_datetime`, `send_reschedule_notifications`)
- **`core/auth.py`** — `random` → `secrets` for password generation. Manual Fisher-Yates shuffle via `secrets.randbelow` (no shuffle helper in `secrets`).
- **`context/AuthContext.js`** — provider `value` wrapped in `useMemo`; `getAuthHeader` wrapped in `useCallback`. Reduces re-renders for every auth consumer in the tree.
- **`core/config.py`** — new `FRONTEND_URL` env var (production sets `https://biomedmeet.com`); falls back to `REACT_APP_BACKEND_URL` for dev.
- **Static marketing site** (`frontend/public/home/`):
  - "Request a demo" header CTA now renders with white text (`!important` added — the `.bm-nav-links a` selector was winning specificity over `.bm-btn-primary`).
  - "Videos" link added to shared nav (`assets/layout.js`) so it appears on every sub-page.
  - Contact email swapped to `Demo@BioMedMeet.com` in `contact.html`, `security.html`, and the layout footer.
- **`MeetingWizardPage.js`** — agenda-item React key uses `patient_id+mrn+index` instead of bare index (avoids stale-state on row removal).
- **Meeting-invite email** (`meeting_invite.html`) — Accept / Decline / View Meeting buttons now use inline CSS for `background-color` + `color: #ffffff` so colors render in Gmail (which strips `<style>` blocks).

### Removed (dead code)
- **`backend/routes/`** — empty stub module (`__init__.py` only); never imported. Deleted.
- **`docs/PATIENT_CARD_FIX.md`** — historical single-bug doc from months ago, no longer accurate.
- **`docs/REFACTORING_P1_P2_SUMMARY.md`** — historical refactor summary; superseded by entries in this CHANGELOG.
- Unused loop variable in `tests/test_profile_regional_settings.py` renamed to `_k`.

### Security
- Cryptographically secure password generation via `secrets` module (was `random`).
- Removed dependence on hardcoded `JWT_SECRET` fallback path is still pending (P1 backlog).

---

## [2.4.0] - 2026-05-13

### Bug fixes
- **Account-setup email** (`account_setup.html`): `Platform URL` and the `Access Platform` button now point to `{frontend_url}/home/` (was bare frontend URL). Applied to all four call sites in `utils/email.py`.
- **Lead-capture emails** (`Demo request`, `Cheat-sheet download`): the `Source` field now contains the full URL `https://biomedmeet.com/home/` (was bare `biomedmeet.com`).
- **Meeting invite buttons** (Accept / Decline / View Meeting): now route to `{frontend_url}/home/` for both invite and reschedule emails.
- **File download** "Not authenticated" error fixed: new `downloadFile()` helper in `lib/api.js` performs an authenticated `GET /files/{id}` with `responseType: 'blob'`, parses `Content-Disposition` for the filename, and triggers a Blob-URL download. Wired into `FilesTab.js` and `PatientDetailPage.js`. 401s surface as toasts.

### Removed (dead code)
- `backend/server_backup.py` (80 KB, replaced long ago by `server.py`)
- `frontend/src/lib/tipsContent.js` (inlined into `TipsDrawer.js`)
- `frontend/src/components/EmptyState.js` (no callers)
- `frontend/src/components/StatusBadges.js` (no callers)
- Auto-fixed 43 ruff F-string / unused-variable warnings across `backend/tests/`

### Added
- **`docs/TECHNICAL_RECREATION_PROMPT.md`** — a single exhaustive prompt covering tech stack, repo layout, env vars, MongoDB schema, REST endpoints, frontend pages and dialogs, email templates, Teams integration, scheduler, ICS generator, holiday checker, Docker compose, and acceptance checklist. Sufficient to recreate the application from scratch.
- README.md rewritten to match the current BioMedMeet brand + repo layout.

---

## [2.3.0] - 2026-05-04

### Bug fixes
- Marketing path renamed `/marketing/` → `/home/` (folder + all internal links).
- App-wide rebrand **MedMeet → BioMedMeet** across login logo, top nav, email footers, ICS PRODID, cheat-sheet PDF (title, author, body, filename).
- Cheat-sheet PDF renamed `MedMeet_CheatSheet.pdf` → `BioMedMeet_CheatSheet.pdf`.

### Added
- BioMedMeet marketing site (8 static pages under `frontend/public/home/`):
  Home, How it works, Security, Contact, plus 4 feature pages.
- New `POST /api/contact` lead-capture endpoint (public, no auth) — stores in `marketing_leads`, emails owner.
- Browser-locale pre-fill on Settings onboarding (`lib/localeDetection.js`).
- Scheduler **auto-complete** pass: meetings flip to `completed` 10 min after end (configurable via `AUTO_COMPLETE_GRACE_MINUTES`).
- Cosmetic consistency pass: unified page headings + CTA button styles + themed icons (`CalendarPlus`, `UserPlus`).
- First-time holiday-setup toast (`HolidaySetupPrompt`).

---

## [2.2.0] - 2026-04-29

### Bug fixes
- **Wizard Step 4 — Requested Provider**: replaced free-text input with a Select sourced from organiser + participants chosen in Step 2.
- **Teams datetime sync**: new `TeamsService.update_online_meeting()` PATCHes the existing onlineMeeting when a meeting is rescheduled.
- **Start / Complete by any participant**: relaxed permission check (backend + frontend).
- **AddAgendaDialog**: organiser now appears in Requested Provider dropdown (tagged `(Organizer)`); amber hint + Add-Participant shortcut when zero participants exist.

### Added
- Confirm Password field + show/hide eye toggles on login/register.
- Post-registration → `/settings` redirect with success toast.

---

## [2.1.0] - 2026-04-28

### Added
- **Email template enhancements**: Teams link moved inside meeting-details box (below Location); Accept / Decline / View Meeting in single horizontal row; `send_datetime_change_email` refactored to reuse the full `meeting_invite.html` with `is_update=True` mode (UPDATED banner + struck-through old schedule + fresh `.ics`).
- **Dialog refactor**: 7 dialogs extracted from `MeetingDetailPage.js` into `components/meeting/dialogs/` (page now < 1000 lines).
- Cloudflare/Tailscale login fix: `REACT_APP_BACKEND_URL` left empty so React calls same-origin `/api/*`.

---

## [2.0.0] - 2026-04-06

### 🎉 Major Release - Documentation Overhaul &amp; Bug Fixes

### Added
- **Treatment Plans Tab** in Patient Detail page
  - Chronological display of treatment recommendations
  - Sorted by date (descending)
  - Associated meeting information
  - Empty state handling

- **User Feedback System**
  - Feedback form in Profile page
  - Three feedback types: Feature Request, Bug Report, Enhancement
  - Email notifications to application owner
  - Beautiful HTML email template with gradient header
  - MongoDB storage for feedback tracking
  - Feedback ID generation for tracking

- **Comprehensive Documentation**
  - New `/app/docs/` folder structure
  - `FEATURES.md` - Complete feature list with examples
  - `API_REFERENCE.md` - Full REST API documentation
  - `CONTRIBUTING.md` - Development workflow and guidelines
  - `CHANGELOG.md` - Version history (this file)
  - Updated `README.md` - Modern, comprehensive main documentation

- **Application Owner Email Configuration**
  - Configurable via `OWNER_EMAIL` environment variable
  - Default: `Niraj.K.Vishwakarma@gmail.com`
  - Used for feedback submissions

### Fixed
- **Critical CORS Authentication Bug**
  - Fixed frontend calling localhost instead of production backend
  - Updated `REACT_APP_BACKEND_URL` to use production URL
  - Resolved "Authentication failed" error on login
  - Fixed CORS wildcard fallback issue

- **Feedback Form Submission Bug**
  - Fixed API request format mismatch (query params vs JSON body)
  - Created `FeedbackRequest` Pydantic model
  - Fixed UUID import error (`uuid4()` → `uuid.uuid4()`)
  - Fixed email function parameter (`body` → `html_content`)
  - Removed incorrect `await` from synchronous `send_email()` call

- **Profile Page Access Issue**
  - Resolved CORS policy blocking authentication check
  - Profile page now loads correctly after login
  - Fixed redirect loop to login screen

### Changed
- **Documentation Structure**
  - Moved all documentation to `/app/docs/` folder
  - Renamed `DOCKER.md` → `docs/DEPLOYMENT.md`
  - Renamed `MONGODB_SCHEMA.md` → `docs/DATABASE.md`
  - Consolidated email guides into `docs/EMAIL_INTEGRATION.md`
  - Moved design files to `docs/`

### Removed
- **Cleaned Up 15 Outdated Files**
  - Deleted `FEATURES_DOCUMENTATION.txt` (outdated)
  - Deleted `MONGODB_SETUP_INSTRUCTIONS.txt` (duplicate)
  - Deleted `test_local_mysql.md` (MySQL abandoned)
  - Deleted `auth_testing.md` (old testing guide)
  - Deleted `CONNECTION_GUIDE.md` (outdated)
  - Deleted `ENV_SETUP_GUIDE.md` (redundant)
  - Deleted `LOCAL_SETUP_GUIDE.md` (redundant)
  - Deleted `EMAIL_INTEGRATION_SUMMARY.md` (duplicate)
  - Deleted `POST_MEETING_SUMMARY_UPDATES.md` (temporary)
  - Deleted `database/ddl.sql` (MySQL schema, not used)
  - Deleted `START_MONGODB.bat` (use Docker instead)
  - Deleted `mongodb_access.sh` (not needed)
  - Deleted `start-docker.bat` (keep .sh only)
  - Deleted `/app/yarn.lock` (duplicate)
  - Deleted empty `/app/tests/` and `/app/database/` folders

### Technical Details
- Updated feedback endpoint to use Pydantic model validation
- Improved error handling in feedback submission
- Enhanced email template with proper HTML structure
- Fixed environment variable usage for CORS configuration

---

## [1.5.0] - 2026-03-25

### Added
- **Post-Meeting PDF Summary Generation**
  - Auto-generate PDF summaries using ReportLab
  - Filename format: `Summary+{Meeting Title}+{Date}+{Time}.pdf`
  - Includes participants, patients (with MRN), agenda, decisions
  - Excludes "Untitled" fields
  - Endpoint: `POST /api/meetings/{id}/summary`

- **Clinical Zen UI Design System**
  - Strict color rotation: Teal (Meetings), Amber (Patients), Purple (Participants), Blue (Dashboard)
  - 32px white space between meeting cards
  - Consistent spacing and typography
  - Ribbon-style "View Full Profile" buttons

### Changed
- Enhanced Patient Detail page layout
- Improved meeting card spacing across all pages
- Updated color scheme to match Clinical Zen guidelines

### Documentation
- Created `POST_MEETING_SUMMARY_FEATURE.md`
- Created `POST_MEETING_SUMMARY_UPDATES.md`

---

## [1.4.0] - 2026-03-15

### Added
- **Dashboard Statistics Color Boxes**
  - Color-coded stat cards (Navy, Teal, Amber, Purple)
  - Improved visual hierarchy
  - Consistent with Clinical Zen theme

### Changed
- Redesigned dashboard layout
- Updated stat card styling

### Documentation
- Created `COLOR_PROPOSAL_STAT_BOXES.md`

---

## [1.3.0] - 2026-03-05

### Added
- **Email Notification System**
  - Meeting invite notifications
  - Response change alerts to organizer
  - 24-hour meeting reminders
  - 1-hour meeting reminders
  - Daily digest emails (8:00 AM)
  - HTML email templates with responsive design

- **Background Task Scheduler**
  - `scheduler.py` for automated tasks
  - Reminder scheduling
  - Daily digest generation

### Changed
- Enhanced email integration
- Improved notification workflow

### Documentation
- Created `EMAIL_INTEGRATION_GUIDE.md`
- Created `EMAIL_INTEGRATION_SUMMARY.md`

---

## [1.2.0] - 2026-03-03

### Added
- **7-Day Treatment Plan Edit Window**
  - Treatment plans editable for 7 days after meeting completion
  - Real-time countdown display
  - Warning banners
  - Automatic read-only after 7 days
  - Helper functions for date calculations

- **Meeting Response System**
  - Dashboard response buttons (Accept/Maybe/Decline)
  - Real-time UI updates
  - Response status tracking in database
  - Participant-only visibility

### Changed
- Updated `MeetingDetailPage.js` with treatment plan window logic
- Enhanced dashboard functionality

---

## [1.1.0] - 2026-02-27

### Added
- **Docker Deployment**
  - Complete Docker containerization
  - `docker-compose.yml` for all services
  - `start-docker.sh` startup script
  - Health check endpoints
  - One-command deployment

- **Participants Management Page**
  - Statistics dashboard
  - Search and filter functionality
  - Grid layout with cards
  - Role-based filtering

- **Create Participant Feature (Organizer Only)**
  - Modal dialog for creating staff
  - Role selection (Doctor/Nurse/Admin/Organizer)
  - Default password: `TempPass123!`
  - Email uniqueness validation

- **Change Participant Role (Organizer Only)**
  - Inline role editor
  - Auto-save on selection
  - Audit trail tracking

### Changed
- Added ParticipantsPage to navigation
- Enhanced user management

### Documentation
- Created `DOCKER.md` with comprehensive deployment guide
- Updated `.env.example` files

---

## [1.0.0] - 2026-02-21

### Added - Initial Release

#### Core Features
- **Authentication System**
  - Email/password login with JWT
  - Google OAuth integration (Emergent-managed)
  - Password change functionality
  - Session management

- **Meeting Management**
  - Multi-step meeting creation wizard
  - Meeting detail page (Case Room)
  - Participant management
  - Patient association
  - Agenda builder
  - File uploads
  - Decision logging
  - Meeting status tracking

- **Patient Management**
  - Create/edit/delete patients
  - Patient records with full demographics
  - Medical history tracking
  - Patient-meeting association
  - Search and filter

- **Dashboard**
  - Statistics overview
  - Upcoming meetings list
  - Pending invites counter
  - Quick actions

#### Tech Stack
- **Frontend:** React 18, Tailwind CSS, Shadcn UI
- **Backend:** FastAPI, MongoDB, Motor
- **Authentication:** JWT, Bcrypt, Google OAuth
- **Email:** SMTP integration
- **PDF:** ReportLab

#### Database Schema
- Users collection
- Meetings collection
- Patients collection
- Meeting_participants collection
- Meeting_patients collection
- Agenda_items collection
- Decision_logs collection
- Files collection

### Documentation
- Created `README.md`
- Created `QUICK_START.md`
- Created `MONGODB_SCHEMA.md`
- Created `MONGODB_INSTALLATION_GUIDE.md`
- Created `PHASE_2_3_PLAN.md`
- Created `DESIGN_PROPOSAL.md`

---

## [Unreleased] - Future Plans

### Planned Features (v2.1.0)
- [ ] Code refactoring (split large files)
- [ ] Email scheduler activation
- [ ] Real-time updates with WebSocket
- [ ] Calendar integration (Google, Outlook)
- [ ] Admin dashboard
- [ ] Cloud storage migration (AWS S3)
- [ ] Mobile app (React Native)

### Under Consideration
- [ ] Advanced search and filtering
- [ ] Notification system (in-app, push)
- [ ] Audit logging UI
- [ ] Password reset functionality
- [ ] Two-factor authentication
- [ ] Role-based dashboard customization
- [ ] Export functionality (CSV, Excel)
- [ ] Advanced analytics
- [ ] Microsoft Teams integration

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| 2.0.0 | 2026-04-06 | Documentation overhaul, Treatment Plans tab, Feedback system, Bug fixes |
| 1.5.0 | 2026-03-25 | PDF generation, Clinical Zen UI |
| 1.4.0 | 2026-03-15 | Dashboard color boxes |
| 1.3.0 | 2026-03-05 | Email notifications, Scheduler |
| 1.2.0 | 2026-03-03 | 7-day edit window, Response system |
| 1.1.0 | 2026-02-27 | Docker, Participants management |
| 1.0.0 | 2026-02-21 | Initial release |

---

## Semantic Versioning

- **MAJOR** (x.0.0): Breaking changes, major features
- **MINOR** (0.x.0): New features, backwards compatible
- **PATCH** (0.0.x): Bug fixes, minor improvements

---

## Maintainers

- **Project Owner:** Niraj Vishwakarma
- **Email:** Niraj.K.Vishwakarma@gmail.com

---

## License

This project is private and proprietary. All rights reserved.

---

**Last Updated:** April 6, 2026
