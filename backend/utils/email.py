"""
Email utility functions for Hospital Meeting App
Handles sending meeting invites, reminders, and notifications
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from jinja2 import Template
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load environment variables first
load_dotenv()

# Email configuration from environment variables
EMAIL_ENABLED = os.getenv("EMAIL_ENABLED", "false").lower() == "true"
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
    ics_content: Optional[str] = None,
    ics_filename: str = "invite.ics",
) -> bool:
    """
    Send an email using SMTP configuration

    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML email body
        text_content: Plain text email body (optional)
        ics_content: iCalendar (.ics) content string — if provided, attached
            as a calendar invite so recipient calendars (Outlook/Google/Apple)
            can add the event in their local timezone, honoring any RRULE.
        ics_filename: Filename for the .ics attachment

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    if not EMAIL_ENABLED:
        logger.info(f"Email disabled. Would send to {to_email}: {subject}")
        return True

    if not SMTP_USER or not SMTP_PASSWORD:
        logger.error("SMTP credentials not configured")
        return False

    try:
        # When an ICS attachment is present we must use a `mixed` container so
        # clients show the calendar invite even with our HTML body.
        if ics_content:
            msg = MIMEMultipart('mixed')
        else:
            msg = MIMEMultipart('alternative')

        msg['Subject'] = subject
        msg['From'] = SMTP_FROM
        msg['To'] = to_email

        body = MIMEMultipart('alternative') if ics_content else msg
        if text_content:
            body.attach(MIMEText(text_content, 'plain'))
        body.attach(MIMEText(html_content, 'html'))
        if ics_content:
            msg.attach(body)

            # 1) Inline calendar part so Outlook/Gmail show "Add to calendar".
            cal_part = MIMEText(ics_content, 'calendar; method=REQUEST; charset="UTF-8"')
            cal_part.add_header('Content-Class', 'urn:content-classes:calendarmessage')
            msg.attach(cal_part)

            # 2) Also attach as a regular file so less-advanced clients download it.
            from email.mime.base import MIMEBase
            from email import encoders as _encoders
            att = MIMEBase('text', 'calendar', method='REQUEST', name=ics_filename)
            att.set_payload(ics_content.encode('utf-8'))
            _encoders.encode_base64(att)
            att.add_header('Content-Disposition', f'attachment; filename="{ics_filename}"')
            msg.attach(att)

        # Send email
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            if SMTP_USE_TLS:
                server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)

        logger.info(f"Email sent successfully to {to_email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False


def load_email_template(template_name: str) -> str:
    """Load email template from templates/emails/ directory"""
    template_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "templates",
        "emails",
        f"{template_name}.html"
    )
    
    try:
        with open(template_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        logger.error(f"Failed to load template {template_name}: {str(e)}")
        return ""


def send_meeting_invite(
    meeting: Dict,
    participant: Dict,
    organizer: Dict,
    frontend_url: str
) -> bool:
    """
    Send meeting invitation email to a participant
    
    Args:
        meeting: Meeting details dict
        participant: Participant user dict
        organizer: Organizer user dict
        frontend_url: Base URL of frontend app
    
    Returns:
        bool: True if sent successfully
    """
    template = load_email_template("meeting_invite")
    if not template:
        return False

    # Format meeting date/time in the recipient's timezone (Plan B regional support)
    from utils.timezone_utils import format_meeting_time_for_user
    meeting_date, meeting_time = format_meeting_time_for_user(
        meeting, participant.get('timezone')
    )
    
    # Create accept/decline links
    meeting_id = meeting.get('id', '')
    accept_link = f"{frontend_url}/meetings/{meeting_id}?action=accept"
    decline_link = f"{frontend_url}/meetings/{meeting_id}?action=decline"
    view_link = f"{frontend_url}/meetings/{meeting_id}"

    # Prefer the auto-generated Teams link; fall back to manually pasted video link.
    meeting_join_url = meeting.get('teams_join_url') or meeting.get('video_link') or ''

    # Render template
    template_obj = Template(template)
    html_content = template_obj.render(
        participant_name=participant.get('name', 'there'),
        organizer_name=organizer.get('name', 'Organizer'),
        meeting_title=meeting.get('title', 'Meeting'),
        meeting_date=meeting_date,
        meeting_time=meeting_time,
        meeting_location=meeting.get('location', 'To be announced'),
        meeting_description=meeting.get('description', ''),
        meeting_join_url=meeting_join_url,
        accept_link=accept_link,
        decline_link=decline_link,
        view_link=view_link
    )
    
    subject = f"Meeting Invitation: {meeting.get('title', 'New Meeting')}"

    # Build .ics calendar attachment so recipients can one-click add to
    # Outlook / Google / Apple calendars in their local timezone, with
    # recurrence preserved.
    ics_content = None
    try:
        from utils.ics_builder import build_meeting_ics
        ics_content = build_meeting_ics(
            meeting=meeting,
            organizer_email=organizer.get('email', SMTP_FROM or 'no-reply@medmeet.local'),
            organizer_name=organizer.get('name', 'Hospital Meeting'),
            participant_email=participant.get('email'),
            participant_name=participant.get('name'),
        )
    except Exception as e:
        logger.warning(f"Could not build .ics for meeting {meeting.get('id')}: {e}")

    return send_email(
        to_email=participant.get('email'),
        subject=subject,
        html_content=html_content,
        ics_content=ics_content,
        ics_filename=f"{meeting.get('title', 'meeting').replace(' ', '_')}.ics",
    )


def send_response_alert(
    meeting: Dict,
    participant: Dict,
    organizer: Dict,
    response_status: str,
    frontend_url: str
) -> bool:
    """
    Send response change notification to meeting organizer
    
    Args:
        meeting: Meeting details dict
        participant: Participant who responded
        organizer: Meeting organizer
        response_status: 'accepted', 'declined', or 'maybe'
        frontend_url: Base URL of frontend app
    
    Returns:
        bool: True if sent successfully
    """
    template = load_email_template("response_change")
    if not template:
        return False
    
    # Map response status to friendly text
    response_map = {
        'accepted': 'accepted',
        'declined': 'declined',
        'maybe': 'responded "maybe" to'
    }
    response_text = response_map.get(response_status, 'responded to')
    
    meeting_link = f"{frontend_url}/meetings/{meeting.get('id', '')}"
    
    template_obj = Template(template)
    html_content = template_obj.render(
        organizer_name=organizer.get('name', 'there'),
        participant_name=participant.get('name', 'A participant'),
        response_text=response_text,
        meeting_title=meeting.get('title', 'Meeting'),
        meeting_date=meeting.get('date', 'TBD'),
        meeting_time=meeting.get('time', 'TBD'),
        meeting_link=meeting_link
    )
    
    subject = f"Meeting Response: {participant.get('name', 'Participant')} {response_text} {meeting.get('title', 'meeting')}"
    
    return send_email(
        to_email=organizer.get('email'),
        subject=subject,
        html_content=html_content
    )


def send_meeting_reminder(
    meeting: Dict,
    participant: Dict,
    reminder_type: str,
    frontend_url: str
) -> bool:
    """
    Send meeting reminder email
    
    Args:
        meeting: Meeting details dict
        participant: Participant to remind
        reminder_type: '24h' or '1h'
        frontend_url: Base URL of frontend app
    
    Returns:
        bool: True if sent successfully
    """
    template = load_email_template("meeting_reminder")
    if not template:
        return False
    
    reminder_text = "24 hours" if reminder_type == "24h" else "1 hour"
    meeting_link = f"{frontend_url}/meetings/{meeting.get('id', '')}"

    # Format meeting date/time in the recipient's timezone (Plan B regional support)
    from utils.timezone_utils import format_meeting_time_for_user
    meeting_date, meeting_time = format_meeting_time_for_user(
        meeting, participant.get('timezone')
    )

    template_obj = Template(template)
    html_content = template_obj.render(
        participant_name=participant.get('name', 'there'),
        reminder_time=reminder_text,
        meeting_title=meeting.get('title', 'Meeting'),
        meeting_date=meeting_date,
        meeting_time=meeting_time,
        meeting_location=meeting.get('location', 'To be announced'),
        meeting_link=meeting_link
    )
    
    subject = f"Reminder: {meeting.get('title', 'Meeting')} in {reminder_text}"
    
    return send_email(
        to_email=participant.get('email'),
        subject=subject,
        html_content=html_content
    )


def send_daily_digest(
    user: Dict,
    todays_meetings: List[Dict],
    upcoming_meetings: List[Dict],
    frontend_url: str
) -> bool:
    """
    Send daily digest email with today's and upcoming meetings
    
    Args:
        user: User details dict
        todays_meetings: List of meetings today
        upcoming_meetings: List of upcoming meetings this week
        frontend_url: Base URL of frontend app
    
    Returns:
        bool: True if sent successfully
    """
    template = load_email_template("daily_digest")
    if not template:
        return False
    
    # Format today's date
    today = datetime.now().strftime("%B %d, %Y")
    
    # Add links to meetings
    for meeting in todays_meetings:
        meeting['link'] = f"{frontend_url}/meetings/{meeting.get('id', '')}"
    
    for meeting in upcoming_meetings:
        meeting['link'] = f"{frontend_url}/meetings/{meeting.get('id', '')}"
    
    template_obj = Template(template)
    html_content = template_obj.render(
        user_name=user.get('name', 'there'),
        today_date=today,
        todays_meetings=todays_meetings,
        upcoming_meetings=upcoming_meetings,
        dashboard_link=f"{frontend_url}/dashboard"
    )
    
    subject = f"Daily Digest: {len(todays_meetings)} meeting(s) today"
    
    return send_email(
        to_email=user.get('email'),
        subject=subject,
        html_content=html_content
    )


def send_datetime_change_email(
    meeting: Dict,
    participant: Dict,
    organizer: Dict,
    old_date: str,
    old_time: str,
    frontend_url: str,
) -> bool:
    """
    Send email notification when meeting date/time is changed.

    Reuses the full meeting_invite.html template in "update" mode so the
    recipient sees the same rich layout (details box, Teams link, action
    buttons) as the original invite, plus an UPDATED banner that shows the
    previous schedule struck through.

    Args:
        meeting: Meeting details dict (with new date/time already applied)
        participant: Participant user dict
        organizer: Organizer user dict
        old_date: Previous meeting date (raw string, for the banner)
        old_time: Previous meeting time (raw string, for the banner)
        frontend_url: Base URL of frontend app

    Returns:
        bool: True if sent successfully
    """
    template = load_email_template("meeting_invite")
    if not template:
        return False

    from utils.timezone_utils import format_meeting_time_for_user
    meeting_date, meeting_time = format_meeting_time_for_user(
        meeting, participant.get('timezone')
    )

    meeting_id = meeting.get('id', '')
    accept_link = f"{frontend_url}/meetings/{meeting_id}?action=accept"
    decline_link = f"{frontend_url}/meetings/{meeting_id}?action=decline"
    view_link = f"{frontend_url}/meetings/{meeting_id}"

    meeting_join_url = meeting.get('teams_join_url') or meeting.get('video_link') or ''

    template_obj = Template(template)
    html_content = template_obj.render(
        participant_name=participant.get('name', 'there'),
        organizer_name=organizer.get('name', 'Organizer'),
        meeting_title=meeting.get('title', 'Meeting'),
        meeting_date=meeting_date,
        meeting_time=meeting_time,
        meeting_location=meeting.get('location', 'To be announced'),
        meeting_description=meeting.get('description', ''),
        meeting_join_url=meeting_join_url,
        accept_link=accept_link,
        decline_link=decline_link,
        view_link=view_link,
        is_update=True,
        old_date=old_date or '',
        old_time=old_time or '',
    )

    subject = f"Meeting Time Changed: {meeting.get('title', 'Meeting')}"

    # Refresh the .ics attachment so recipients' calendars update automatically.
    ics_content = None
    try:
        from utils.ics_builder import build_meeting_ics
        ics_content = build_meeting_ics(
            meeting=meeting,
            organizer_email=organizer.get('email', SMTP_FROM or 'no-reply@medmeet.local'),
            organizer_name=organizer.get('name', 'Hospital Meeting'),
            participant_email=participant.get('email'),
            participant_name=participant.get('name'),
        )
    except Exception as e:
        logger.warning(f"Could not build .ics for updated meeting {meeting.get('id')}: {e}")

    return send_email(
        to_email=participant.get('email'),
        subject=subject,
        html_content=html_content,
        ics_content=ics_content,
        ics_filename=f"{meeting.get('title', 'meeting').replace(' ', '_')}.ics",
    )



def send_account_setup_email(
    user: Dict,
    temp_password: str,
    meeting: Dict,
    organizer: Dict,
    frontend_url: str
) -> bool:
    """
    Send account setup email with login credentials to newly created user
    
    Args:
        user: User details dict
        temp_password: Temporary password for first login
        meeting: Meeting details dict
        organizer: Meeting organizer details
        frontend_url: Base URL of frontend app
    
    Returns:
        bool: True if sent successfully
    """
    template = load_email_template("account_setup")
    if not template:
        return False
    
    template_obj = Template(template)
    html_content = template_obj.render(
        participant_name=user.get('name', user.get('email', 'there')),
        meeting_title=meeting.get('title', 'Hospital Case Meeting'),
        platform_url=frontend_url,
        user_email=user.get('email'),
        temp_password=temp_password,
        organizer_name=organizer.get('name', 'Meeting Organizer')
    )
    
    subject = "Account Setup: Access for Hospital Case Meeting Scheduler"
    
    return send_email(
        to_email=user.get('email'),
        subject=subject,
        html_content=html_content
    )


def send_password_reset_email(
    user: Dict,
    new_password: str,
    frontend_url: str
) -> bool:
    """
    Send password reset email with new credentials
    
    Args:
        user: User details dict
        new_password: New randomly generated password
        frontend_url: Base URL of frontend app
    
    Returns:
        bool: True if sent successfully
    """
    template = load_email_template("password_reset")
    if not template:
        return False
    
    template_obj = Template(template)
    html_content = template_obj.render(
        user_name=user.get('name', user.get('email', 'there')),
        user_email=user.get('email'),
        new_password=new_password,
        platform_url=frontend_url
    )
    
    subject = "Password Reset: Hospital Case Meeting Scheduler"
    
    return send_email(
        to_email=user.get('email'),
        subject=subject,
        html_content=html_content
    )



def send_combined_account_setup_and_invite(
    user: Dict,
    temp_password: str,
    meeting: Dict,
    organizer: Dict,
    frontend_url: str
) -> bool:
    """
    Send combined email with account credentials AND meeting invitation
    
    Args:
        user: User details dict
        temp_password: Temporary password for first login
        meeting: Meeting details dict
        organizer: Meeting organizer details
        frontend_url: Base URL of frontend app
    
    Returns:
        bool: True if sent successfully
    """
    template = load_email_template("account_setup_with_invite")
    if not template:
        return False
    
    meeting_id = meeting.get('id')
    user_id = user.get('id')
    
    template_obj = Template(template)
    html_content = template_obj.render(
        participant_name=user.get('name', user.get('email', 'there')),
        meeting_title=meeting.get('title', 'Hospital Case Meeting'),
        meeting_description=meeting.get('description', 'Discussion of patient treatment plan'),
        meeting_date=meeting.get('meeting_date', meeting.get('date', 'TBD')),
        meeting_time=meeting.get('start_time', meeting.get('time', 'TBD')),
        meeting_location=meeting.get('location', 'To be announced'),
        platform_url=frontend_url,
        user_email=user.get('email'),
        temp_password=temp_password,
        organizer_name=organizer.get('name', 'Meeting Organizer'),
        accept_url=f"{frontend_url}/meetings/{meeting_id}/respond?user_id={user_id}&response=accepted",
        decline_url=f"{frontend_url}/meetings/{meeting_id}/respond?user_id={user_id}&response=declined",
        view_url=f"{frontend_url}/meetings/{meeting_id}"
    )
    
    subject = f"Account Setup & Meeting Invitation: {meeting.get('title', 'Hospital Meeting')}"
    
    return send_email(
        to_email=user.get('email'),
        subject=subject,
        html_content=html_content
    )


def send_simple_account_setup_email(
    user: Dict,
    temp_password: str,
    frontend_url: str
) -> bool:
    """
    Send simple account setup email with credentials only (no meeting details)
    Used when creating account before meeting is created
    
    Args:
        user: User details dict
        temp_password: Temporary password for first login
        frontend_url: Base URL of frontend app
    
    Returns:
        bool: True if sent successfully
    """
    template = load_email_template("account_setup_simple")
    if not template:
        return False
    
    template_obj = Template(template)
    html_content = template_obj.render(
        user_name=user.get('name', user.get('email', 'there')),
        platform_url=frontend_url,
        user_email=user.get('email'),
        temp_password=temp_password
    )
    
    subject = "Account Setup: Hospital Case Meeting Scheduler Login Credentials"
    
    return send_email(
        to_email=user.get('email'),
        subject=subject,
        html_content=html_content
    )
