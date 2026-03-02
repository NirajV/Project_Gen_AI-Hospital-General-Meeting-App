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
    text_content: Optional[str] = None
) -> bool:
    """
    Send an email using SMTP configuration
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML email body
        text_content: Plain text email body (optional)
    
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
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = SMTP_FROM
        msg['To'] = to_email
        
        # Add text and HTML parts
        if text_content:
            part1 = MIMEText(text_content, 'plain')
            msg.attach(part1)
        
        part2 = MIMEText(html_content, 'html')
        msg.attach(part2)
        
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
    
    # Parse meeting date and time
    meeting_date = meeting.get('date', 'TBD')
    meeting_time = meeting.get('time', 'TBD')
    
    # Create accept/decline links
    meeting_id = meeting.get('id', '')
    accept_link = f"{frontend_url}/meetings/{meeting_id}?action=accept"
    decline_link = f"{frontend_url}/meetings/{meeting_id}?action=decline"
    view_link = f"{frontend_url}/meetings/{meeting_id}"
    
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
        accept_link=accept_link,
        decline_link=decline_link,
        view_link=view_link
    )
    
    subject = f"Meeting Invitation: {meeting.get('title', 'New Meeting')}"
    
    return send_email(
        to_email=participant.get('email'),
        subject=subject,
        html_content=html_content
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
    
    template_obj = Template(template)
    html_content = template_obj.render(
        participant_name=participant.get('name', 'there'),
        reminder_time=reminder_text,
        meeting_title=meeting.get('title', 'Meeting'),
        meeting_date=meeting.get('date', 'TBD'),
        meeting_time=meeting.get('time', 'TBD'),
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
