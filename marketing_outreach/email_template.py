"""
HTML email body builder for the BioMedMeet outreach campaign.

Produces a polished, brand-matched email that:
  - greets the recipient by hospital + digital-transformation team name
  - pitches BioMedMeet in 80 words
  - embeds 7 video thumbnails linking to the public MP4 URLs
  - clear "Book a demo" CTA + main app URL
  - country-aware legal footer (CAN-SPAM, GDPR, DPDP)
"""
from __future__ import annotations
from .legal_footers import get_footer


APP_URL = "https://biomedmeet.com/"
MARKETING_URL = "https://biomedmeet.com/marketing/"
DEMO_URL = "https://biomedmeet.com/home/contact.html#demo"
HOW_IT_WORKS_URL = "https://biomedmeet.com/home/how-it-works.html"

# Step illustrations hosted on biomedmeet.com (extracted slide thumbnails of
# the same scenes that appear in the marketing videos — keeps brand consistent).
HOW_IT_WORKS_STEPS = [
    {
        "n": 1,
        "title": "Set the meeting",
        "blurb": "Title, date, timezone, location. One click generates a Microsoft Teams link via Microsoft Graph. Holiday- and weekend-aware.",
        "thumb": f"{MARKETING_URL}thumbs/step1.jpg",
        "color": "#3b6658",
    },
    {
        "n": 2,
        "title": "Invite participants & patients",
        "blurb": "Pull doctors and nurses from your hospital directory; add the patients whose cases will be discussed. Email + .ics invites go out automatically.",
        "thumb": f"{MARKETING_URL}thumbs/step2.jpg",
        "color": "#68517d",
    },
    {
        "n": 3,
        "title": "Build the agenda",
        "blurb": "One agenda item per patient case — diagnosis, requested provider, discussion notes, treatment plan. Live-editable during the meeting.",
        "thumb": f"{MARKETING_URL}thumbs/step3.jpg",
        "color": "#694e20",
    },
    {
        "n": 4,
        "title": "Run · decide · export",
        "blurb": "Capture binding decisions live, then generate a styled PDF summary in one click — ready for the patient record and referring physicians.",
        "thumb": f"{MARKETING_URL}thumbs/step4.jpg",
        "color": "#0b0b30",
    },
]

VIDEOS = [
    {
        "file": "00-marketing-hero.mp4",
        "title": "BioMedMeet — 60-second overview",
        "blurb": "The 60-second pitch. Hospital case meetings without the chaos.",
        "duration": "62s",
    },
    {
        "file": "01-schedule-meeting.mp4",
        "title": "Schedule a meeting in under 60 seconds",
        "blurb": "3-step wizard · auto Teams link · invites + .ics.",
        "duration": "54s",
    },
    {
        "file": "02-patients-and-treatment-plans.mp4",
        "title": "Patients & treatment plans",
        "blurb": "First-class patient records · 360° history · versioned plans.",
        "duration": "42s",
    },
    {
        "file": "03-decisions-and-summary-pdf.mp4",
        "title": "Decisions log + summary PDF",
        "blurb": "Audit trail built in. From decision to documentation in one click.",
        "duration": "40s",
    },
    {
        "file": "04-reminders-and-calendar.mp4",
        "title": "Automatic reminders & calendar",
        "blurb": "1h reminders · RFC 5545 .ics · auto-complete after end-time.",
        "duration": "39s",
    },
    {
        "file": "05-participants-and-roles.mp4",
        "title": "Participants & roles",
        "blurb": "Doctor, Nurse, Admin, Organizer — onboard in seconds.",
        "duration": "58s",
    },
    {
        "file": "06-profile-and-settings.mp4",
        "title": "Profile, password & regional settings",
        "blurb": "Timezone-aware everything. Holidays, languages, feedback.",
        "duration": "62s",
    },
]


SUBJECT_TEMPLATES = {
    "US": "Reducing coordination time on hospital case meetings · BioMedMeet · {hospital}",
    "EU": "A workflow tool for multidisciplinary case meetings · BioMedMeet · {hospital}",
    "UK": "A workflow tool for multidisciplinary case meetings · BioMedMeet · {hospital}",
    "IN": "BioMedMeet · A case-meeting workflow tool built for hospitals · {hospital}",
    "DEFAULT": "BioMedMeet · Hospital case meetings, without the chaos · {hospital}",
}


def render_subject(country: str, hospital: str) -> str:
    tpl = SUBJECT_TEMPLATES.get(country.upper(), SUBJECT_TEMPLATES["DEFAULT"])
    return tpl.format(hospital=hospital)


def _video_card(v: dict) -> str:
    url = f"{MARKETING_URL}{v['file']}"
    return f"""
    <tr>
      <td style="padding:6px 0;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="56" valign="top" style="padding-right:14px;">
              <a href="{url}" style="text-decoration:none;">
                <div style="width:56px; height:56px; background:#0b0b30; border-radius:10px; text-align:center; line-height:56px; font-size:22px; color:#fff;">▶</div>
              </a>
            </td>
            <td valign="top">
              <a href="{url}" style="text-decoration:none; color:#0b0b30;">
                <div style="font-size:15px; font-weight:700; font-family: 'Helvetica Neue', Arial, sans-serif;">{v['title']}</div>
                <div style="font-size:13px; color:#4b5063; margin-top:2px;">{v['blurb']}</div>
                <div style="font-size:11px; color:#68517d; margin-top:4px; font-weight:700;">▶ Watch · {v['duration']}</div>
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    """


def render_html(
    country: str,
    hospital: str,
    team_name: str,
    contact_first_name: str,
    contact_full_name: str,
    contact_title: str,
    sender_name: str,
    sender_email: str,
    sender_postal_address: str,
    recipient_email: str,
) -> str:
    """Build the full HTML email body."""
    video_rows = "".join(_video_card(v) for v in VIDEOS)
    footer = get_footer(country).format(
        recipient_email=recipient_email,
        sender_name=sender_name,
        sender_email=sender_email,
        sender_postal_address=sender_postal_address,
    )

    # Dynamic greeting — uses real first name if we have it.
    if contact_first_name and contact_first_name.lower() not in ("team", ""):
        greeting = f"Dear {contact_first_name},"
    elif contact_full_name:
        greeting = f"Dear {contact_full_name},"
    else:
        greeting = f"Hello {team_name or hospital + ' team'},"

    # Dynamic opening line — references their job title if we have it.
    role_phrase = (
        f"As {contact_title} at <strong>{hospital}</strong>"
        if contact_title
        else f"To the team at <strong>{hospital}</strong>"
    )

    # How-it-works block — 4 steps with image thumbnails
    steps_html = "".join(
        f"""
        <tr>
          <td style="padding:10px 0;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="92" valign="top" style="padding-right:14px;">
                  <a href="{HOW_IT_WORKS_URL}#step{s['n']}" style="text-decoration:none;">
                    <div style="width:84px; height:84px; background:{s['color']}; border-radius:14px; text-align:center; line-height:84px; font-size:38px; color:#ffffff; font-family:'Helvetica Neue',Arial,sans-serif; font-weight:800;">{s['n']}</div>
                  </a>
                </td>
                <td valign="top">
                  <a href="{HOW_IT_WORKS_URL}#step{s['n']}" style="text-decoration:none; color:#0b0b30;">
                    <div style="font-size:11px; font-weight:700; color:{s['color']}; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:2px;">Step {s['n']} of 4</div>
                    <div style="font-size:17px; font-weight:800; font-family:'Helvetica Neue',Arial,sans-serif; color:#0b0b30;">{s['title']}</div>
                    <div style="font-size:13.5px; color:#4b5063; line-height:1.55; margin-top:4px;">{s['blurb']}</div>
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        """
        for s in HOW_IT_WORKS_STEPS
    )

    return f"""<!doctype html>
<html><body style="margin:0; padding:0; background:#f8f5fa; font-family: 'Helvetica Neue', Arial, sans-serif; color:#1a1c2e;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f8f5fa">
  <tr><td align="center">
    <table cellpadding="0" cellspacing="0" border="0" width="640" style="background:#ffffff; border-radius:16px; margin:32px 0;">
      <!-- Header -->
      <tr>
        <td style="padding:32px 36px 16px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background:#0b0b30; width:40px; height:40px; border-radius:10px; text-align:center; vertical-align:middle; color:#fff; font-weight:800; font-size:18px;">~</td>
              <td style="padding-left:12px; font-family: 'Helvetica Neue', Arial, sans-serif; font-size:20px; font-weight:800; color:#0b0b30;">
                BioMedMeet
                <div style="font-size:11px; font-weight:500; color:#6b7280;">Hospital Case Meeting Scheduler</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Body -->
      <tr><td style="padding:8px 36px 8px;">
        <p style="font-size:15px; line-height:1.6; color:#1a1c2e;">{greeting}</p>
        <p style="font-size:15px; line-height:1.6; color:#1a1c2e;">
          {role_phrase}, I think <strong>BioMedMeet</strong> may be directly relevant
          to your work on <strong>{team_name or 'digital transformation'}</strong>.
        </p>
        <p style="font-size:15px; line-height:1.6; color:#1a1c2e;">
          BioMedMeet is a purpose-built workflow tool for the multidisciplinary case
          meetings that run every hospital — tumour boards, M&amp;M, case reviews,
          MDTs. It replaces the WhatsApp groups, Excel sheets and email chains that
          coordinators use today, with one workspace that schedules, invites,
          captures decisions, and exports a styled PDF summary ready for the
          patient record.
        </p>

        <!-- Highlights -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:16px 0;">
          <tr>
            <td style="background:#f3edf5; border-radius:12px; padding:14px 18px; font-size:14px; color:#4b3a5c;">
              <strong>One-click Microsoft Teams</strong> · auto-generated meeting links via Microsoft Graph.
            </td>
          </tr>
          <tr><td height="8"></td></tr>
          <tr>
            <td style="background:#e8f5f0; border-radius:12px; padding:14px 18px; font-size:14px; color:#3b6658;">
              <strong>Timezone &amp; holiday aware</strong> · every invite renders in the recipient's local clock.
            </td>
          </tr>
          <tr><td height="8"></td></tr>
          <tr>
            <td style="background:#fef3c7; border-radius:12px; padding:14px 18px; font-size:14px; color:#694e20;">
              <strong>Built-in audit trail</strong> · who decided what and when, ready for the medical record.
            </td>
          </tr>
        </table>

        <!-- How it works -->
        <div style="margin-top:28px; padding-top:24px; border-top:1px solid #e6e1ea;">
          <div style="font-size:11px; font-weight:700; color:#68517d; letter-spacing:0.1em; text-transform:uppercase;">How it works</div>
          <div style="font-size:22px; font-weight:800; font-family:'Helvetica Neue',Arial,sans-serif; color:#0b0b30; margin-top:6px; line-height:1.25;">
            From empty calendar slot to logged decision — in four steps.
          </div>
          <div style="font-size:14px; color:#4b5063; margin-top:8px;">
            No training day required. <a href="{HOW_IT_WORKS_URL}" style="color:#68517d; font-weight:700; text-decoration:none;">See the full walkthrough →</a>
          </div>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:18px;">
            {steps_html}
          </table>
        </div>

        <!-- Videos -->
        <div style="margin-top:28px; padding-top:24px; border-top:1px solid #e6e1ea;">
          <div style="font-size:11px; font-weight:700; color:#3b6658; letter-spacing:0.1em; text-transform:uppercase;">Watch · 90-second walkthroughs</div>
          <div style="font-size:22px; font-weight:800; font-family:'Helvetica Neue',Arial,sans-serif; color:#0b0b30; margin-top:6px; line-height:1.25;">
            Seven short videos. Every feature covered.
          </div>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:14px;">
            {video_rows}
          </table>
        </div>

        <!-- CTAs -->
        <table cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
          <tr>
            <td>
              <a href="{DEMO_URL}" style="background:#68517d; color:#ffffff; text-decoration:none; padding:14px 24px; border-radius:10px; font-weight:800; font-size:15px; display:inline-block;">Book a 15-min demo →</a>
            </td>
            <td style="padding-left:12px;">
              <a href="{APP_URL}" style="background:#ffffff; color:#0b0b30; text-decoration:none; padding:14px 24px; border-radius:10px; font-weight:700; font-size:15px; border:1px solid #e6e1ea; display:inline-block;">Open biomedmeet.com</a>
            </td>
          </tr>
        </table>

        <!-- Signature -->
        <p style="font-size:14px; color:#4b5063; line-height:1.6; margin-top:8px;">
          Happy to share more detail, technical architecture, or a sandbox account.
          A 15-minute call is enough to decide if it's worth a deeper look.
        </p>
        <p style="font-size:14px; color:#1a1c2e; line-height:1.6;">
          Best regards,<br/>
          <strong>{sender_name}</strong><br/>
          BioMedMeet · <a href="{APP_URL}" style="color:#68517d; text-decoration:none;">biomedmeet.com</a><br/>
          <a href="mailto:{sender_email}" style="color:#68517d; text-decoration:none;">{sender_email}</a>
        </p>
      </td></tr>

      <!-- Legal footer (country-specific) -->
      <tr><td style="padding:0 36px 32px;">
        <hr style="border:none; border-top:1px solid #e6e1ea; margin:24px 0 0;"/>
        {footer}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>"""


def render_plain_text(
    hospital: str,
    team_name: str,
    contact_first_name: str,
    contact_full_name: str,
    contact_title: str,
    sender_name: str,
    sender_email: str,
) -> str:
    """Plain-text fallback for email clients without HTML support."""
    if contact_first_name and contact_first_name.lower() != "team":
        greeting = f"Dear {contact_first_name},"
    elif contact_full_name:
        greeting = f"Dear {contact_full_name},"
    else:
        greeting = f"Hello {team_name or hospital + ' team'},"
    role_phrase = (
        f"As {contact_title} at {hospital},"
        if contact_title else
        f"To the team at {hospital},"
    )
    video_list = "\n".join(
        f"  - {v['title']} ({v['duration']}): {MARKETING_URL}{v['file']}"
        for v in VIDEOS
    )
    steps_list = "\n".join(
        f"  {s['n']}. {s['title']} — {s['blurb']}"
        for s in HOW_IT_WORKS_STEPS
    )
    return f"""{greeting}

{role_phrase} I think BioMedMeet may be directly relevant to your work on
{team_name or 'digital transformation'}.

BioMedMeet is a purpose-built workflow tool for hospital multidisciplinary case
meetings — tumour boards, M&M, case reviews, MDTs. It replaces the WhatsApp
groups, Excel sheets and email chains that coordinators use today.

Highlights:
  - One-click Microsoft Teams meeting links (via Microsoft Graph)
  - Timezone- and holiday-aware scheduling
  - Built-in audit trail and decision log
  - Auto-generated PDF summary after each meeting

HOW IT WORKS (4 steps):
{steps_list}

Full walkthrough: {HOW_IT_WORKS_URL}

VIDEOS — seven short voice-over walkthroughs (each under 90 seconds):
{video_list}

▶ Book a 15-min demo:  {DEMO_URL}
▶ Open the application: {APP_URL}

A 15-minute call is enough to decide if it's worth a deeper look.

Best regards,
{sender_name}
BioMedMeet — {APP_URL}
{sender_email}

---
To unsubscribe, reply with the word UNSUBSCRIBE in the subject or body.
"""
