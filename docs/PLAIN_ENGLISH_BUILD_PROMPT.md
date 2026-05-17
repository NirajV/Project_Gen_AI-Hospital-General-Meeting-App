# BioMedMeet — Plain English Build Prompt

> Hand this file to any coding agent (Cursor, Claude, GPT, Emergent, etc.)
> and it will have everything it needs to rebuild the application from scratch.
> No tech jargon required to understand it — but every detail is here.

---

## 1. What we are building (the elevator pitch)

Build a web application called **BioMedMeet — Hospital Case Meeting Scheduler**.

It is a tool that hospitals use to **organise multi-disciplinary case meetings**
(also called Tumour Boards, MDT meetings, case review rounds). Doctors, nurses,
and administrators use it to:

1. Schedule a meeting.
2. Add the **patients** whose cases will be discussed.
3. Invite the right **doctors and specialists**.
4. Build an **agenda** (one entry per patient case).
5. Hold the meeting (in person or over Microsoft Teams).
6. Record the **decisions and treatment plans** made for each patient.
7. Send everyone a **summary PDF and calendar invite** afterwards.

Think "Google Calendar meets Epic, but built for hospital case meetings."

The product replaces the messy mix of WhatsApp groups, Excel sheets and email
chains that hospitals currently use to coordinate these meetings.

---

## 2. Who uses it

Five user roles, all with the same login flow but different permissions:

| Role | What they can do |
|---|---|
| **Organizer** | Anything. Creates meetings, adds users, manages everything. |
| **Admin** | Same as Organizer (system administrator). |
| **Doctor** | Be invited to meetings, add/discuss patients, add treatment plans. |
| **Nurse** | Be invited to meetings, view patients, participate. |
| **Staff** | View-only participation (future role, low priority). |

Users sign up with their hospital email or via Google. They set their
**country, timezone, language, and which holidays they observe** the first
time they log in.

---

## 3. The two faces of the product

The product has **two separate front-ends** living on the same domain:

### 3a. Marketing site (`biomedmeet.com/home/`)
A simple **8-page static HTML site** that explains what BioMedMeet is and lets
prospective hospitals **book a demo** or **download a one-page cheat sheet PDF**.
No login required. Pages:

1. **Home** — hero, "what hospitals use it for", testimonials, CTA.
2. **Features** — meetings, patients, decisions, Teams, PDFs.
3. **For Hospitals** — value prop for hospital administrators.
4. **For Doctors** — value prop for clinicians.
5. **Pricing** — three tiers (Starter / Growth / Enterprise) with a "talk to us" CTA.
6. **Security & Compliance** — HIPAA, data residency, audit logs.
7. **About** — story, team, contact.
8. **Contact** — form that posts a lead into the app database.

Every form on this site (Demo Request, Cheat Sheet Download, Contact)
saves a row in a `marketing_leads` collection in the database via a single
public endpoint `POST /api/contact`.

The cheat sheet is a generated **PDF** that gets placed at
`/docs/BioMedMeet_CheatSheet.pdf`. There is a Python script that builds it
from a template — re-run it any time the branding changes.

### 3b. The application itself (`biomedmeet.com/`)
A React **single-page app** that lives behind login. This is where 99% of the
product is. Described in detail below.

The marketing site and the app share the same domain. Nginx serves the
`/home/*` static files first; everything else falls back to the React app.

---

## 4. The screens inside the app

After login, the user lands on the **Dashboard** and has a left/top navigation
to move between sections.

### 4.1 Dashboard
- 4 stat cards: **Upcoming meetings**, **Pending invites**, **Patients in care**, **Decisions this month**.
- A "Next meeting" panel that shows the very next meeting on the user's calendar with a one-click "Join Teams" button.
- A "Recent activity" feed (last 10 events across meetings).

### 4.2 Meetings list
- Grid of meeting cards, colour-coded by status (Scheduled / In progress / Completed / Cancelled).
- Filters: date range, status, organiser, patient.
- Big **+ New meeting** button (top right) → opens the meeting wizard.

### 4.3 Meeting wizard (create a new meeting)
A 3-step wizard:

1. **Basics**: title, type (Tumour Board / Case Review / MDT / Other), date, start time, end time, timezone, location.
2. **Participants**: pick existing users from a typeahead OR invite by email; pick patients to discuss.
3. **Review & create**: optional checkbox **"Generate a Microsoft Teams meeting link"**. Hitting Create:
   - Validates the date is not a weekend or configured holiday.
   - Generates a Teams meeting link (if requested).
   - Saves the meeting.
   - Sends every participant an **email invite** with Accept / Decline / View buttons and an **`.ics` calendar attachment**.

### 4.4 Meeting detail page
The most complex screen in the app. Tabs:

1. **Overview** — title, date/time in the viewer's local timezone, location, Teams link, organiser, status, "Mark as completed" button (organiser only).
2. **Participants** — list with response status (Accepted / Declined / Pending). Organiser can add or remove participants here. Each invitee gets re-invited by email when added.
3. **Patients** — list of patients being discussed. Organiser can add/remove. When a non-organiser adds a patient, it goes into "pending approval" and the organiser sees an Approve button.
4. **Agenda** — one entry per patient case: diagnosis, requested provider, free-text discussion notes, **treatment plan** (the doctors' decision). Each row has its own edit dialog.
5. **Decisions** — quick chronological log of binding decisions made during the meeting (separate from the per-case treatment plans). Each decision has owner, due date, status.
6. **Files** — upload images, lab results, scans, reports. Files are stored on disk (or future S3) and re-downloadable via a secure authenticated download.

Other actions on this page:
- **Edit date / time** — reschedules the meeting. Recomputes the Teams meeting time. Sends every participant a "Meeting time changed" email with a fresh `.ics` attachment.
- **Delete meeting** — soft delete; participants get a cancellation email.
- **Generate summary PDF** — once the meeting is completed, anyone can download a styled PDF summary covering agenda, decisions, attendees, and files.

### 4.5 Patients
- List of all patients in the hospital (search, filter by department).
- Patient form (Add / Edit): MRN, first name, last name, DOB, gender, department, allergies, primary diagnosis, comorbidities, current medications.
- Patient detail page tabs:
   1. Overview — demographics, allergies, primary diagnosis.
   2. Meetings — all meetings this patient has been (or will be) discussed in.
   3. Files — files attached to this patient across meetings, with secure download.
   4. Treatment plans — every treatment plan that was set for this patient across past meetings, sorted newest first.

### 4.6 Participants (users / staff directory)
- List of all users in the hospital.
- Add user form — name, email, role, specialty, organization. Optional "send account setup email" toggle: if on, the user gets a temporary password by email and is forced to change it on first login.

### 4.7 Profile / Settings
Tabs:
1. **Profile information** — name, specialty, organisation, phone (email is read-only).
2. **Settings** — country, timezone, language, observed holidays, default meeting duration.
3. **Change password** — current + new + confirm with show/hide toggles.
4. **Feedback** — submit feedback to product team.

### 4.8 Auth pages
- **Login** — email + password, "Forgot password" link, **Google sign-in** button (Emergent-managed Google OAuth).
- **Register** — name, email, password, confirm password, role.
- **Forgot password** — enter email → token mailed → reset page.
- **Password reset** — enter new password using the token in the URL.
- **Force password change modal** — pops up automatically when the user logs in with the temporary password they were emailed.

---

## 5. Notifications (email is a first-class feature)

Every important event sends a polished HTML email. The user **must never have to refresh the app to know what's happening**. Email types:

1. **Meeting invite** — sent on meeting create / participant add. Includes Accept / Decline / View buttons that link to `/home/` (we keep the buttons on the public site so recipients without a login can still see context). Comes with an `.ics` attachment so the meeting drops straight into Outlook / Google Calendar / Apple Calendar.
2. **Meeting time changed** — sent when organiser edits the date or time. Carries an updated `.ics`.
3. **Meeting cancelled** — sent on delete.
4. **Response alert** — sent to the organiser when a participant Accepts or Declines.
5. **Meeting reminder** — sent automatically **1 hour before** the meeting starts to every participant who has accepted.
6. **Account setup** — sent when admin creates a new user with "send setup email" on. Contains temporary password + setup link.
7. **Password reset** — sent on Forgot password.
8. **Daily digest** (optional) — sent each morning summarising meetings today.

There is a **background scheduler** that runs every minute and is responsible for:
- Sending the 1-hour reminder emails.
- Auto-marking meetings as **Completed** once their end time passes.

Emails are sent via SMTP (Gmail by default). The SMTP credentials live in
environment variables on the Docker host (NOT in the backend container's `.env`,
because docker-compose only reads the root-level `.env` for substitution).

---

## 6. Integrations

### 6a. Microsoft Teams
When the organiser ticks "Generate a Teams meeting link", the backend calls the
**Microsoft Graph API** with the hospital's Azure AD app credentials and creates
a Teams **Online Meeting**. The join URL and meeting ID are saved on the meeting
record and surfaced on the detail page and in every email.

If the meeting time is edited, the existing Teams meeting is **updated in place**
(not duplicated). If the meeting is deleted, the Teams meeting is cancelled.

Required hospital-side secrets (env vars):
`MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_ORGANIZER_USER_ID`.

### 6b. Google OAuth (sign-in)
Use Emergent-managed Google Auth. One-click sign-in, auto-creates the user
record on first login. No password is set for Google users; the password
field stays null.

### 6c. SMTP (email)
Gmail SMTP by default. App-password based. Env vars:
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`.

### 6d. Holiday calendar
Country-specific holiday data is bundled in the app. When the user picks their
country in Settings, the relevant national holiday list is pre-selected. They
can toggle individual holidays on/off. The meeting wizard refuses to schedule
on a date that the user marked as a holiday or weekend.

---

## 7. Visual design

- **Brand**: BioMedMeet. The logo is the wordmark "BioMedMeet" with a small
  stethoscope/heart mark. Primary brand colour is a desaturated **purple/plum** (`#68517d`), with rotating accent colours used for cards (teal, amber, navy).
- **Typography**: Inter, weights 400 / 500 / 600 / 700 / 800.
- **Layout**: clean, generous whitespace, card-based. **Not** a corporate dashboard look — feels more like Notion than Salesforce.
- **Component library**: shadcn/ui on top of Tailwind. Toast notifications via `sonner`.
- **Icons**: lucide-react. No emoji in the UI.
- **Buttons**: rounded, themed with subtle hover lift. Every CTA has an icon on its left.
- **Tables**: avoided wherever possible. Use card grids instead.
- **Dialogs**: small focused modals — never wall-of-text. Each one does one job.

Every interactive element needs a `data-testid`. Use kebab-case names that describe what the element does (`add-patient-btn`, `meeting-card-${id}`, `file-download-${idx}`, etc.).

---

## 8. Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 (Create React App), React Router 7, Tailwind, shadcn/ui, lucide-react, axios, sonner, date-fns |
| Backend | FastAPI (Python 3.11), motor (async MongoDB driver), pydantic v2, bcrypt, pyjwt, httpx, aiofiles, apscheduler-style background loop |
| Database | MongoDB |
| Reverse proxy | Nginx — proxies `/api/*` to backend, serves `/home/*` from disk, falls back to React SPA for everything else. |
| Container | Docker + docker-compose (one container per service). |
| Tunnel | Cloudflare Tunnel + Tailscale for LAN/remote access without exposing ports. |

The backend lives at `/app/backend/`, the frontend at `/app/frontend/`. All
backend routes are prefixed with `/api`. All frontend API calls go through a
single `axios` instance at `/app/frontend/src/lib/api.js` that auto-attaches
the JWT from localStorage and auto-redirects to `/login` on session 401.

The backend used to be one giant `server.py`; it has been refactored so that:
- `core/` holds DB, auth, config helpers.
- `models/` holds pydantic schemas.
- `services/` holds external API clients (Teams).
- `utils/` holds email, PDF, ICS, timezone, holiday helpers.
- `scheduler.py` runs the background loop.
- `routes/` is reserved for further extraction (next refactor).

The frontend has been refactored so that the meeting detail page's seven
giant dialogs each live in their own file under
`/app/frontend/src/components/meeting/dialogs/`.

---

## 9. Data model (MongoDB collections)

- **users** — `id`, `email`, `password_hash`, `name`, `role`, `specialty`, `organization`, `phone`, `timezone`, `country`, `language`, `holidays`, `must_change_password`, `created_at`.
- **patients** — `id`, `mrn`, `first_name`, `last_name`, `dob`, `gender`, `department_name`, `allergies`, `primary_diagnosis`, `comorbidities`, `medications`, `is_active`, `created_by`, `created_at`.
- **meetings** — `id`, `title`, `meeting_type`, `meeting_date`, `start_time`, `end_time`, `timezone`, `location`, `status`, `organizer_id`, `teams_join_url`, `teams_meeting_id`, `created_at`.
- **meeting_participants** — `meeting_id`, `user_id`, `response_status`.
- **meeting_patients** — `meeting_id`, `patient_id`, `added_by`, `approval_status`.
- **agenda_items** — `id`, `meeting_id`, `patient_id`, `diagnosis`, `requested_provider`, `discussion_notes`, `treatment_plan`, `created_at`.
- **decisions** — `id`, `meeting_id`, `text`, `owner_id`, `due_date`, `status`, `created_at`.
- **file_attachments** — `id`, `meeting_id`, `patient_id`, `original_name`, `file_type`, `mime_type`, `file_path`, `created_at`.
- **marketing_leads** — `id`, `name`, `email`, `hospital`, `phone`, `form_type`, `source`, `status`, `created_at`.

**Rules:**
- Use UUID strings for `id`. Never expose Mongo's `_id`.
- Use `datetime.now(timezone.utc)` and store ISO strings.
- Always exclude `_id` from query projections.

---

## 10. Security rules

1. JWT auth on every `/api` endpoint except the **3 public ones**:
   - `POST /api/auth/login`
   - `POST /api/auth/register`
   - `POST /api/contact` (marketing site lead capture)
2. Password hashing with bcrypt (cost 12).
3. File download endpoint **requires JWT**. Frontend must fetch as a blob with the `Authorization` header — never use `<a href="/api/files/...">`, because a browser-initiated navigation has no auth header and will return 401.
4. CORS allow-list driven by env var `CORS_ORIGINS`.
5. Rate-limit `/api/auth/login` to slow down brute force.
6. Password reset tokens expire after 1 hour and are single-use.

---

## 11. Things that should "just work"

- Hot reload in dev for both frontend and backend.
- All URLs, ports, secrets read from `.env` — no hardcoded fallbacks.
- The app works equally well over: localhost, LAN IP (e.g. `192.168.x.x`), Tailscale name, or Cloudflare tunnel domain. Achieve this by making `REACT_APP_BACKEND_URL` empty so the frontend makes **same-origin requests** (`/api/...`) and Nginx routes them.
- Timezones: every datetime shown to the user is rendered in **their** local timezone (from their profile), not the server's.
- Browser tab title: **"BioMedMeet — Hospital Case Meeting Scheduler"**.

---

## 12. What success looks like

- A new hospital can spin up the entire stack with **one `docker compose up`**.
- An organiser can schedule a meeting in **under 60 seconds**, including
  generating a Teams link and inviting 8 doctors.
- Every participant gets an email **with an `.ics` they can click once** and
  the meeting is on their calendar.
- One hour before the meeting, everyone gets a reminder, automatically.
- After the meeting, the organiser clicks one button and gets a PDF summary
  ready to file in the patient's record.

If your build delivers those five outcomes, you've built BioMedMeet correctly.

---

## 13. Future / nice-to-have (don't build these on day one)

- Cloud file storage (S3 / Azure Blob) instead of local disk.
- Full UTC migration of meeting timestamps in MongoDB.
- A dedicated "Staff" role with view-only access.
- Real-time presence indicators ("Dr. Kumar is viewing this meeting").
- Mobile app (React Native).
- Multi-language UI (we already capture the user's language preference; we just don't use it yet).

---

*This is the build prompt. Hand it to any agent. Ask questions if anything is unclear.*
