# BioMedMeet Roadmap

> Last refreshed: **Feb 2026**
> Source of truth for prioritisation. P0 = blocker / committed for next release · P1 = important · P2 = nice-to-have · P3 = future.

---

## ✅ Recently shipped (Feb 2026)

- Google Workspace `demo@biomedmeet.com` deliverable sender (SPF / DKIM / DMARC).
- Marketing CLI privacy hardening + multi-recipient override fix.
- Meeting-invite email → in-app RSVP (`?action=accept|decline`) via `useRsvpFromUrl` hook.
- Scheduler refactor + new `AUTO_COMPLETE_GRACE_MINUTES` env knob (default 120).
- Meeting CRUD extraction into `services/meeting_helpers.py` (complexity 23-29 → ≤5 per handler).
- `secrets`-based password generation.
- Static marketing site fixes (button contrast, Videos nav link, contact email).
- Code cleanup: removed dead `backend/routes/`, two stale fix-history docs.

---

## P0 — Next release

- [ ] **Gmail "Yes" RSVP propagation** — when a recipient clicks the auto-rendered "Yes/No/Maybe" in Gmail's calendar card, the response is recorded in Google Calendar **but not** in BioMedMeet. Two viable paths:
  - (a) parse inbound iCalendar `METHOD:REPLY` emails and update `meeting_participants.response_status`, or
  - (b) subscribe to Google Calendar push notifications via the Calendar API.
- [ ] **`.ics` calendar invite still not showing as a real event in Google Calendar** — audit `utils/ics_builder.py` for `METHOD:REQUEST`, `UID`, `ORGANIZER`, `ATTENDEE` correctness. The current attachment shows as a "card" but no event is created on click.
- [ ] **MS Teams policy propagation** — verify on-prod that newly-created meetings now generate a Teams join URL after Microsoft's policy propagation finishes.

---

## P1 — Security hardening

- [ ] Remove hardcoded `JWT_SECRET` default fallback in `core/config.py` — fail fast if missing.
- [ ] Add `slowapi` rate-limiting on `/api/auth/login` to prevent brute force.
- [ ] File-upload validation: enforce allowed extensions + max size at the FastAPI handler.
- [ ] Audit `/api/files/{id}` download auth scoping — confirm only meeting participants can fetch.
- [ ] **Auth token storage** — migrate from `localStorage` to `httpOnly` + `Secure` + `SameSite=Lax` cookies. Requires Docker/nginx cookie-domain config and a careful migration so existing users aren't logged out.

---

## P2 — Architecture & DX

- [ ] **Split `MeetingDetailPage.js`** (1010 lines) — move handler groups into custom hooks (`useMeetingFiles`, `useMeetingDecisions`, `useMeetingParticipants`) and tab containers into separate files. The page should be a thin orchestrator.
- [ ] **Split `PatientDetailPage.js`** (650 lines) into per-section components (`PatientOverview`, `PatientMeetings`, `PatientFiles`, `PatientDecisions`).
- [ ] **Split `ParticipantsPage.js`** (612 lines) — extract `ParticipantsTable` and `CreateParticipantDialog` components.
- [ ] **`MeetingWizardPage.js`** (1400 lines) — one component per wizard step.
- [ ] Cloud file storage migration (S3 / Azure Blob) so uploads stop sitting on the Docker volume.
- [ ] Full UTC `datetime` migration in MongoDB — currently `meeting_date` / `start_time` are stored as naive local strings; scheduler depends on this implicit contract.

---

## P3 — Future

- [ ] Admin "Staff" role implementation (department coordinator persona).
- [ ] AI-generated meeting summaries from agenda + decisions.
- [ ] PACS / EMR integration (HL7 FHIR).
- [ ] Outlook + Google Calendar two-way sync (beyond the email-invite path).
- [ ] In-app notification centre (replace toast-only flows).

---

## Active branches

None currently — main is the only active branch.
