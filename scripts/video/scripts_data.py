"""
BioMedMeet — Video narration scripts.

Five videos. Each video has:
  - id        : short slug used as filename
  - title     : human title
  - duration  : approximate seconds (TTS pacing target)
  - voice     : OpenAI TTS voice (nova = warm-professional female US-English)
  - segments  : ordered list of (caption, narration, scene_id, hold_seconds)
                * caption     -> on-screen overlay text (short)
                * narration   -> spoken text (longer)
                * scene_id    -> name of a Playwright scene function in record_scenes.py
                * hold_seconds-> how long the scene should stay on screen
"""

VOICE = "nova"          # warm-professional female (closest to "neutral US-English female")
MODEL = "tts-1-hd"      # HD voice quality for marketing
SPEED = 1.0

VIDEOS = [
    # =====================================================================
    # 1. Marketing hero — technical pitch
    # ====================================================================
    {
        "id": "00-marketing-hero",
        "title": "BioMedMeet — Hospital Case Meeting Scheduler",
        "segments": [
            {
                "scene_id": "intro_brand",
                "caption": "BioMedMeet",
                "hold": 4.5,
                "narration": (
                    "Meet BioMedMeet. The hospital case meeting platform "
                    "that replaces WhatsApp groups and Excel sheets with a "
                    "single, fully automated workflow."
                ),
            },
            {
                "scene_id": "marketing_dashboard",
                "caption": "Dashboard · at a glance",
                "hold": 6.0,
                "narration": (
                    "From one dashboard, organisers see upcoming meetings, "
                    "pending invites, and patients in care — across every "
                    "department, in real time."
                ),
            },
            {
                "scene_id": "marketing_wizard",
                "caption": "Schedule with Microsoft Teams",
                "hold": 7.0,
                "narration": (
                    "Scheduling a new meeting takes seconds. Pick the date, "
                    "the timezone, the participants and the patients. "
                    "BioMedMeet calls the Microsoft Graph API and generates "
                    "a Teams meeting link automatically."
                ),
            },
            {
                "scene_id": "marketing_emails",
                "caption": "Automated invites + .ics calendar",
                "hold": 6.5,
                "narration": (
                    "Every participant receives a branded email invite with "
                    "an RFC five-five-four-five calendar attachment. Accept "
                    "or decline updates flow back in real time, and a one "
                    "hour reminder is dispatched by a background scheduler."
                ),
            },
            {
                "scene_id": "marketing_meeting_detail",
                "caption": "Agenda · Decisions · PDF Summary",
                "hold": 7.0,
                "narration": (
                    "During the meeting, capture the agenda, the treatment "
                    "plan for each patient, and the binding decisions. "
                    "Afterwards, generate a complete PDF summary in one "
                    "click — ready for the patient record."
                ),
            },
            {
                "scene_id": "outro_cta",
                "caption": "biomedmeet.com",
                "hold": 4.0,
                "narration": (
                    "BioMedMeet. Built for clinicians, by clinicians. "
                    "Visit biomedmeet dot com to book a demo."
                ),
            },
        ],
    },

    # =====================================================================
    # 2. Feature — Schedule a meeting with Teams
    # =====================================================================
    {
        "id": "01-schedule-meeting",
        "title": "Schedule a meeting in under 60 seconds",
        "segments": [
            {
                "scene_id": "feat_intro_schedule",
                "caption": "Schedule a meeting",
                "hold": 4.0,
                "narration": (
                    "Here's how to schedule a complete hospital case meeting "
                    "in BioMedMeet, including a Microsoft Teams link, in "
                    "less than a minute."
                ),
            },
            {
                "scene_id": "feat_open_wizard",
                "caption": "New Meeting",
                "hold": 5.0,
                "narration": (
                    "From the dashboard, click New Meeting. A guided wizard "
                    "walks the organiser through three steps."
                ),
            },
            {
                "scene_id": "feat_wizard_basics",
                "caption": "Step 1 — Title, type, date, timezone",
                "hold": 6.5,
                "narration": (
                    "Step one: name the meeting, choose the type — Tumour "
                    "Board, Case Review or M D T — then set the date, time "
                    "and timezone. BioMedMeet validates against weekends "
                    "and configured holidays."
                ),
            },
            {
                "scene_id": "feat_wizard_participants",
                "caption": "Step 2 — Participants + patients",
                "hold": 6.5,
                "narration": (
                    "Step two: add participants from your directory or "
                    "invite them by email. Then pick the patients whose "
                    "cases will be discussed."
                ),
            },
            {
                "scene_id": "feat_wizard_teams",
                "caption": "Step 3 — Generate Teams link",
                "hold": 6.5,
                "narration": (
                    "Step three: tick Generate Microsoft Teams Link. "
                    "BioMedMeet calls Microsoft Graph and creates the online "
                    "meeting. Every participant gets the join URL by email "
                    "with a calendar invite attached."
                ),
            },
            {
                "scene_id": "feat_outro_schedule",
                "caption": "Done in under a minute",
                "hold": 3.5,
                "narration": (
                    "That's a fully scheduled, fully invited, Teams ready "
                    "case meeting — in well under sixty seconds."
                ),
            },
        ],
    },

    # =====================================================================
    # 3. Feature — Patient cards + treatment plans
    # =====================================================================
    {
        "id": "02-patients-and-treatment-plans",
        "title": "Patient cards and treatment plans",
        "segments": [
            {
                "scene_id": "feat_intro_patients",
                "caption": "Patients are first-class",
                "hold": 4.0,
                "narration": (
                    "In BioMedMeet, patients are first class records — not "
                    "just rows on a meeting agenda."
                ),
            },
            {
                "scene_id": "feat_patients_list",
                "caption": "Patient directory",
                "hold": 5.5,
                "narration": (
                    "The patient directory holds the M R N, demographics, "
                    "department, allergies, current medications and "
                    "comorbidities, all searchable by name or record "
                    "number."
                ),
            },
            {
                "scene_id": "feat_patient_detail",
                "caption": "Patient · 360° view",
                "hold": 7.0,
                "narration": (
                    "Open any patient to see a complete history: every "
                    "meeting they were discussed in, every file attached to "
                    "them, and every treatment plan ever set — sorted from "
                    "newest to oldest."
                ),
            },
            {
                "scene_id": "feat_treatment_plans",
                "caption": "Treatment plans · audited",
                "hold": 6.5,
                "narration": (
                    "Treatment plans are versioned and timestamped. The "
                    "organiser approves additions, and every decision is "
                    "linked back to the meeting that produced it."
                ),
            },
            {
                "scene_id": "feat_outro_patients",
                "caption": "Continuity of care",
                "hold": 3.5,
                "narration": (
                    "Continuity of care, without copy-pasting between "
                    "WhatsApp messages and chart notes."
                ),
            },
        ],
    },

    # =====================================================================
    # 4. Feature — Decisions + Summary PDF
    # =====================================================================
    {
        "id": "03-decisions-and-summary-pdf",
        "title": "Decisions and one-click summary PDF",
        "segments": [
            {
                "scene_id": "feat_intro_decisions",
                "caption": "Capture every decision",
                "hold": 4.0,
                "narration": (
                    "Every clinical decision deserves a paper trail. "
                    "BioMedMeet makes it effortless."
                ),
            },
            {
                "scene_id": "feat_decisions_log",
                "caption": "Decision log · live during the meeting",
                "hold": 6.5,
                "narration": (
                    "During the meeting, log binding decisions in real "
                    "time. Each entry carries an owner, a due date and a "
                    "status — open, in progress, or done."
                ),
            },
            {
                "scene_id": "feat_summary_button",
                "caption": "Generate Summary PDF",
                "hold": 5.5,
                "narration": (
                    "When the meeting ends, click Generate Summary. "
                    "BioMedMeet builds a styled P D F covering the agenda, "
                    "the treatment plans, the decisions, the attendees, "
                    "and every attached file."
                ),
            },
            {
                "scene_id": "feat_pdf_preview",
                "caption": "Ready for the patient record",
                "hold": 6.0,
                "narration": (
                    "The P D F is branded, formatted, and ready to file in "
                    "the patient record or share with referring physicians. "
                    "No more chasing minutes from three different inboxes."
                ),
            },
            {
                "scene_id": "feat_outro_decisions",
                "caption": "Audit trail built-in",
                "hold": 3.5,
                "narration": (
                    "Audit trail, built in. From decision to documentation, "
                    "in one click."
                ),
            },
        ],
    },

    # =====================================================================
    # 5. Feature — Reminders + .ics calendar
    # =====================================================================
    {
        "id": "04-reminders-and-calendar",
        "title": "Automatic reminders and calendar invites",
        "segments": [
            {
                "scene_id": "feat_intro_reminders",
                "caption": "Reminders run themselves",
                "hold": 4.0,
                "narration": (
                    "Forgotten meetings are a thing of the past. BioMedMeet "
                    "automates the boring parts."
                ),
            },
            {
                "scene_id": "feat_ics_attached",
                "caption": ".ics · RFC 5545",
                "hold": 6.0,
                "narration": (
                    "Every invite email carries a standards-compliant dot "
                    "I C S attachment. Outlook, Google Calendar and Apple "
                    "Calendar all accept it with one click."
                ),
            },
            {
                "scene_id": "feat_reminder_scheduler",
                "caption": "1-hour-before reminder",
                "hold": 6.5,
                "narration": (
                    "A background scheduler runs every minute. One hour "
                    "before each meeting, it dispatches a reminder email "
                    "to every participant who accepted. No human input "
                    "required."
                ),
            },
            {
                "scene_id": "feat_auto_complete",
                "caption": "Auto-complete after end-time",
                "hold": 6.0,
                "narration": (
                    "Once the end time passes, the meeting is marked "
                    "complete automatically and the organiser is prompted "
                    "to log treatment plans and generate the summary."
                ),
            },
            {
                "scene_id": "feat_outro_reminders",
                "caption": "Set it and forget it",
                "hold": 3.5,
                "narration": (
                    "Schedule once. BioMedMeet handles the rest."
                ),
            },
        ],
    },

    # =====================================================================
    # 6. Feature — Participants & team management
    # =====================================================================
    {
        "id": "05-participants-and-roles",
        "title": "Manage your hospital team — Participants & roles",
        "segments": [
            {
                "scene_id": "feat_intro_participants",
                "caption": "Your hospital team",
                "hold": 4.0,
                "narration": (
                    "Every hospital is a team. BioMedMeet gives you one "
                    "place to manage that team — with roles, specialties, "
                    "and instant onboarding."
                ),
            },
            {
                "scene_id": "feat_participants_overview",
                "caption": "Participants · at a glance",
                "hold": 7.5,
                "narration": (
                    "The Participants page shows the whole hospital at a "
                    "glance — total members, doctors, nurses, and admins. "
                    "Search by name, email or specialty. Filter by role "
                    "with a single click."
                ),
            },
            {
                "scene_id": "feat_role_assignment",
                "caption": "Four roles · click to change",
                "hold": 8.0,
                "narration": (
                    "Every member has a clearly assigned role: Doctor, "
                    "Nurse, Admin or Organiser. Change a role inline with "
                    "one click — permissions update everywhere across the "
                    "app, instantly."
                ),
            },
            {
                "scene_id": "feat_create_participant",
                "caption": "Create a participant in seconds",
                "hold": 9.0,
                "narration": (
                    "Adding a new staff member is a single form. Name, "
                    "email, role, specialty and phone — done. BioMedMeet "
                    "creates the account, assigns a temporary password, "
                    "and prepares the onboarding email."
                ),
            },
            {
                "scene_id": "feat_credentials_email",
                "caption": "Auto-onboarding email · forced password change",
                "hold": 8.5,
                "narration": (
                    "The new participant receives a welcome email with "
                    "their temporary password and a login link. On first "
                    "sign-in, they're prompted to set their own password "
                    "before anything else."
                ),
            },
            {
                "scene_id": "feat_outro_participants",
                "caption": "Your whole team · one workspace",
                "hold": 4.0,
                "narration": (
                    "Your whole hospital team — onboarded, organised, and "
                    "ready to meet. In BioMedMeet."
                ),
            },
        ],
    },
]
