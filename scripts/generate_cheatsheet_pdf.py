"""
Generator for /app/frontend/public/docs/MedMeet_CheatSheet.pdf

Run with:  cd /app && python3 scripts/generate_cheatsheet_pdf.py

Outputs the PDF in place so the frontend can serve it at /docs/MedMeet_CheatSheet.pdf.
"""
from pathlib import Path
from datetime import date

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable, KeepTogether,
)
from reportlab.lib.enums import TA_LEFT

OUTPUT = Path("/app/frontend/public/docs/MedMeet_CheatSheet.pdf")
APP_URL = "https://biomedmeet.com/"
VERSION = f"v1.1 · May {date.today().year}"

# Brand palette (matches the frontend section themes).
NAVY = HexColor("#0b0b30")
GREEN = HexColor("#3b6658")
OLIVE = HexColor("#694e20")
PURPLE = HexColor("#68517d")
SLATE = HexColor("#475569")
MUTED = HexColor("#64748b")


def build_styles():
    base = getSampleStyleSheet()

    return {
        "title": ParagraphStyle(
            "Title", parent=base["Title"], fontName="Helvetica-Bold",
            fontSize=22, leading=26, textColor=NAVY, spaceAfter=2,
            alignment=TA_LEFT,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle", parent=base["Normal"], fontName="Helvetica",
            fontSize=10.5, textColor=MUTED, spaceAfter=10, alignment=TA_LEFT,
        ),
        "h2": ParagraphStyle(
            "H2", parent=base["Heading2"], fontName="Helvetica-Bold",
            fontSize=13.5, leading=17, textColor=NAVY,
            spaceBefore=10, spaceAfter=4,
        ),
        "h3": ParagraphStyle(
            "H3", parent=base["Heading3"], fontName="Helvetica-Bold",
            fontSize=10.8, leading=14, textColor=GREEN,
            spaceBefore=6, spaceAfter=2,
        ),
        "body": ParagraphStyle(
            "Body", parent=base["Normal"], fontName="Helvetica",
            fontSize=9.4, leading=13.5, textColor=SLATE, spaceAfter=2,
        ),
        "step": ParagraphStyle(
            "Step", parent=base["Normal"], fontName="Helvetica",
            fontSize=9.4, leading=13.2, textColor=SLATE,
            leftIndent=12, bulletIndent=0, spaceAfter=1,
        ),
        "footer": ParagraphStyle(
            "Footer", parent=base["Normal"], fontName="Helvetica-Oblique",
            fontSize=8.5, textColor=MUTED, spaceBefore=6, alignment=TA_LEFT,
        ),
    }


def section(styles, heading, blocks):
    """One top-level section: h2 heading + a list of (sub_heading, [steps])."""
    flow = [Paragraph(heading, styles["h2"])]
    for sub_heading, steps in blocks:
        flow.append(Paragraph(sub_heading, styles["h3"]))
        for i, step in enumerate(steps, start=1):
            flow.append(Paragraph(f"{i}.&nbsp;&nbsp;{step}", styles["step"]))
        flow.append(Spacer(1, 2))
    flow.append(HRFlowable(width="100%", thickness=0.5, color=HexColor("#e2e8f0"),
                           spaceBefore=4, spaceAfter=2))
    return KeepTogether(flow)


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    styles = build_styles()

    doc = SimpleDocTemplate(
        str(OUTPUT), pagesize=A4,
        leftMargin=16 * mm, rightMargin=16 * mm,
        topMargin=14 * mm, bottomMargin=14 * mm,
        title="MedMeet – Quick Reference",
        author="MedMeet",
    )

    story = []
    story.append(Paragraph("MedMeet – Quick Reference", styles["title"]))
    story.append(Paragraph(
        f"Hospital Case Meeting Scheduler · {VERSION}", styles["subtitle"]))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY,
                            spaceBefore=2, spaceAfter=6))

    story.append(section(styles, "1. Getting Started", [
        ("Login", [
            f"Open your MedMeet URL — <b><font color='#0b0b30'>{APP_URL}</font></b>",
            "Enter email and password, or click <b>Google</b> for Google SSO.",
            "Registering? Fill Email, Password, <b>Confirm Password</b>, name, specialty, organization. "
            "Click the 👁 icon on either password field to reveal what you typed.",
            "After registration you land on <b>Profile → Settings</b> with a toast: "
            "“Account created successfully! Please complete your preferences.”",
        ]),
        ("Regional setup (do once)", [
            "Avatar → Profile → <b>Settings</b> tab.",
            "Pick Language, Country, Timezone.",
            "Configure Holidays (enforce toggle + tick country defaults + add custom).",
            "Click Save. Invite emails and .ics attachments will use your timezone.",
        ]),
    ]))

    story.append(section(styles, "2. Meetings", [
        ("Create meeting", [
            "Top nav → <b>Meetings</b> → <b>New Meeting</b> (green button, calendar+ icon).",
            "Step 1: title, date, start/end time.",
            "Meeting type — for video: click <b>Generate Teams Link</b> to auto-create an MS Teams meeting.",
            "Step 2: pick participants (existing users or invite by email).",
            "Step 3: pick patients. Step 4: Agenda items — <b>Requested Provider</b> dropdown is now "
            "populated from organiser + participants chosen in Step 2.",
            "Review &amp; submit. Invite emails with .ics attachments are sent automatically.",
        ]),
        ("Change meeting date / time", [
            "Open meeting → <b>Edit Date &amp; Time</b> button (organiser only).",
            "Update fields and save.",
            "All participants receive an <b>“Updated”</b> invitation email (full invite layout, "
            "previous schedule struck through) and a refreshed .ics attachment.",
            "The Microsoft Teams meeting is rescheduled automatically — participants see the new time "
            "when they open the same Teams link.",
        ]),
        ("Start / Complete meeting", [
            "Any meeting participant (not just the organiser) can hit <b>Start Meeting</b>.",
            "Click <b>Complete Meeting</b> when done — any participant can do this too.",
            "Treatment Plans on agenda items are editable for <b>7 days</b> after completion.",
        ]),
    ]))

    story.append(section(styles, "3. Participants &amp; Patients", [
        ("Add participant (existing meeting)", [
            "Open meeting → <b>Participants</b> tab → <b>Add Participant</b>.",
            "Tab 1 “Existing Doctors” — pick from your organisation.",
            "Tab 2 “Invite by Email” — auto-creates an account and emails setup instructions.",
        ]),
        ("Add patient", [
            "During meeting creation: Step 3 of the wizard.",
            "Existing meeting: Patients tab → <b>Add Patient</b> (olive button, user+ icon).",
            "Pick an existing patient, or open the “Create New Patient” tab (14-field form).",
            "Patients added by a non-organiser need organiser approval (✓ button on the card).",
        ]),
        ("Participants &amp; patient cards", [
            "Participant cards show response badges: pending / accepted / declined.",
            "Patient cards show status, MRN, diagnosis and the clinical question.",
            "Click <b>View Full Profile →</b> to open the full patient record.",
        ]),
    ]))

    story.append(section(styles, "4. Agenda &amp; Files", [
        ("Add agenda item", [
            "Meeting → <b>Agenda</b> tab → <b>Add Agenda Item</b>.",
            "<b>Requested Provider</b> is now a dropdown of every meeting participant "
            "(organiser included and tagged as such).",
            "If no participants are in the meeting yet, the dialog shows an amber hint with "
            "<b>Add Participant Now</b> — opens the participant dialog and returns you to the agenda flow.",
            "Pick patient + MRN, diagnosis, reason, tick Pathology/Radiology if needed.",
        ]),
        ("Update Treatment Plan", [
            "On an agenda card → <b>Edit</b> button.",
            "Write / update the plan and Save.",
            "After the meeting is Completed, still editable for 7 days.",
        ]),
        ("Upload files", [
            "Meeting → <b>Files</b> tab → <b>Upload File</b>.",
            "Pick the file, type (radiology / pathology / lab / consent / other).",
            "Tag it to a patient for easier filtering (optional).",
        ]),
        ("Log a decision", [
            "Meeting → <b>Decisions</b> tab → <b>Add Decision</b>.",
            "Title, description, action plan, priority, follow-up date.",
            "Only the organiser can delete decisions before the meeting is completed.",
        ]),
    ]))

    story.append(section(styles, "5. Profile &amp; Settings", [
        ("Update profile", [
            "Avatar → Profile → <b>Profile Information</b> tab.",
            "Edit first/last name, specialty, organisation. Email is fixed.",
        ]),
        ("Change password", [
            "Avatar → Profile → <b>Change Password</b> tab.",
            "Current + new + confirm. Min 8 characters.",
            "Wrong current password shows a toast — it does NOT log you out.",
        ]),
        ("Regional settings", [
            "Avatar → Profile → <b>Settings</b> tab.",
            "Language, Country (ISO list, 250+), Timezone (IANA, ~50 common).",
            "Applied to invite emails and .ics calendar attachments.",
        ]),
        ("Holidays", [
            "Settings tab → Holidays card.",
            "Toggle enforcement on/off (top right).",
            "Tick default holidays for your country (US / IN / GB).",
            "Add custom holidays (name + date; optional “Repeat yearly”).",
            "Save. Meeting creation on blocked dates is prevented.",
        ]),
        ("Send feedback", [
            "Avatar → Profile → <b>Feedback</b> tab.",
            "Category (bug / feature / general / other), subject, message → Submit.",
        ]),
    ]))

    story.append(section(styles, "6. Calendar &amp; Teams Integration", [
        ("Teams meeting link", [
            "In the wizard: <b>Generate Teams Link</b> auto-fills the Meeting Link field.",
            "On an existing meeting: <b>Generate Teams Link</b> button at the top-right.",
            "A single <b>Join Teams Meeting</b> button is shown once a link exists — and is also "
            "embedded inside the blue meeting-details box of every invite email, right below Location.",
            "If you change date/time, the Teams meeting is auto-rescheduled.",
        ]),
        ("Auto-add to calendar", [
            "Every invite email includes a .ics attachment.",
            "Click the attachment → Outlook / Google / Apple offers <b>Add to calendar</b>.",
            "Event lands in YOUR local timezone automatically.",
        ]),
        ("Recurring meetings", [
            "Pick a recurrence in the wizard (daily / weekly / bi-weekly / monthly / quarterly / yearly).",
            ".ics embeds the correct RRULE → calendar apps show a recurring series.",
        ]),
    ]))

    story.append(section(styles, "7. Invite Emails (new layout)", [
        ("What the email looks like", [
            "Details box: Date, Time, Location, and <b>Teams link</b> are grouped together.",
            "Three actions in a single row: <b>Accept</b> · <b>Decline</b> · <b>View Meeting</b>.",
            ".ics attachment with your timezone and correct RRULE for recurrences.",
        ]),
        ("When date/time changes", [
            "Recipients get the same rich invite layout with an <b>UPDATED</b> banner on top.",
            "Previous schedule is shown struck through so the change is obvious.",
            "A refreshed .ics is attached — drop it on your calendar to overwrite the old event.",
        ]),
    ]))

    story.append(section(styles, "8. Email Reminders", [
        ("Automatic 1-hour reminder", [
            "Background scheduler polls every 5 minutes.",
            "Sends ONE reminder ~1 hour before each scheduled meeting.",
            "Deduplicated — never sends twice for the same meeting.",
            "Disable globally: set <b>EMAIL_REMINDERS_ENABLED=false</b> in backend <i>.env</i>.",
        ]),
    ]))

    story.append(section(styles, "9. Quick Links", [
        ("In-app paths", [
            "<b>/dashboard</b> — overview, upcoming meetings, KPIs",
            "<b>/meetings</b> — meeting list",
            "<b>/meetings/new</b> — create meeting wizard (4 steps)",
            "<b>/meetings/{id}</b> — meeting detail / case room",
            "<b>/patients</b> — patient list",
            "<b>/patients/{id}</b> — patient profile",
            "<b>/participants</b> — staff &amp; participant directory",
            "<b>/profile</b> — profile, settings, feedback, change password",
            "<b>/settings</b> — direct shortcut to Profile → Settings tab",
        ]),
        ("In-app help", [
            "Top nav → Help icon (next to your avatar).",
            "Browse tip cards across 4 categories — each card has step-by-step instructions.",
        ]),
    ]))

    story.append(Paragraph(
        f"This cheat sheet covers MedMeet {VERSION}. Primary URL: "
        f"<b><font color='#0b0b30'>{APP_URL}</font></b>", styles["footer"]))

    doc.build(story)
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
