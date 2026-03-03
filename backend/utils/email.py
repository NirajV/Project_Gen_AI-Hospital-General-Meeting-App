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


def send_datetime_change_email(
    meeting_title: str,
    participant: Dict,
    organizer: Dict,
    old_date: str,
    old_time: str,
    new_date: str,
    new_time: str,
    meeting_link: str
) -> bool:
    """
    Send email notification when meeting date/time is changed
    
    Args:
        meeting_title: Title of the meeting
        participant: Participant user dict
        organizer: Organizer user dict
        old_date: Previous meeting date
        old_time: Previous meeting time
        new_date: New meeting date
        new_time: New meeting time
        meeting_link: Link to meeting details
    
    Returns:
        bool: True if sent successfully
    """
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Meeting Date/Time Changed</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
            }}
            .container {{
                background-color: #ffffff;
                border-radius: 8px;
                padding: 30px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}
            .header {{
                text-align: center;
                padding-bottom: 20px;
                border-bottom: 2px solid #f59e0b;
                margin-bottom: 30px;
            }}
            .header h1 {{
                color: #d97706;
                margin: 0;
                font-size: 24px;
            }}
            .alert-box {{
                background-color: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 20px;
                margin: 20px 0;
                border-radius: 4px;
            }}
            .change-details {{
                background-color: #fafafa;
                padding: 20px;
                margin: 20px 0;
                border-radius: 4px;
            }}
            .old-value {{
                color: #dc2626;
                text-decoration: line-through;
            }}
            .new-value {{
                color: #059669;
                font-weight: 600;
            }}
            .button {{
                display: inline-block;
                padding: 12px 30px;
                margin: 20px 0;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                font-size: 14px;
                background-color: #f59e0b;
                color: #ffffff;
            }}
            .button-container {{
                text-align: center;
            }}
            .footer {{
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 12px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>⚠️ Meeting Date/Time Changed</h1>
            </div>
            
            <p>Hi {participant.get('name', 'there')},</p>
            
            <div class="alert-box">
                <p style="margin: 0; font-size: 16px;">
                    <strong>{organizer.get('name', 'The organizer')}</strong> has changed the date/time for:
                </p>
                <h3 style="margin: 10px 0 0 0; color: #d97706;">{meeting_title}</h3>
            </div>
            
            <div class="change-details">
                <h3 style="margin-top: 0; color: #374151;">Updated Schedule:</h3>
                
                <div style="margin: 15px 0;">
                    <p style="margin: 5px 0;"><strong>📅 Date:</strong></p>
                    <p style="margin: 5px 0 5px 20px;">
                        <span class="old-value">{old_date}</span> → 
                        <span class="new-value">{new_date}</span>
                    </p>
                </div>
                
                <div style="margin: 15px 0;">
                    <p style="margin: 5px 0;"><strong>🕐 Time:</strong></p>
                    <p style="margin: 5px 0 5px 20px;">
                        <span class="old-value">{old_time}</span> → 
                        <span class="new-value">{new_time}</span>
                    </p>
                </div>
            </div>
            
            <div class="button-container">
                <a href="{meeting_link}" class="button">View Updated Meeting</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                Please update your calendar with the new meeting time. If this change causes a conflict, 
                please contact the organizer as soon as possible.
            </p>
            
            <div class="footer">
                <p>This is an automated message from Hospital Meeting Scheduler</p>
                <p>© 2026 MedMeet. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    subject = f"Meeting Time Changed: {meeting_title}"
    
    return send_email(
        to_email=participant.get('email'),
        subject=subject,
        html_content=html_content
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
