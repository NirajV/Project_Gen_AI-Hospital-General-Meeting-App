# 📧 Email Integration Documentation

## Overview
The Hospital Meeting App now includes comprehensive email notifications for meetings and participants.

## Email Features

### 1. 📩 Meeting Invite Notifications
**When**: Automatically sent when a meeting is created and participants are added
**Recipient**: All invited participants (except the organizer)
**Content**:
- Meeting title, date, time, and location
- Meeting description
- Quick action buttons: Accept, Decline
- Link to view meeting details

### 2. 🔔 Response Change Alerts  
**When**: Sent when a participant accepts, declines, or responds "maybe" to a meeting
**Recipient**: Meeting organizer
**Content**:
- Participant name and their response
- Meeting details
- Link to view all responses

### 3. ⏰ Meeting Reminders
**When**: 
- 24 hours before the meeting
- 1 hour before the meeting
**Recipient**: All participants who accepted the meeting
**Content**:
- Meeting details reminder
- Time until meeting starts
- Link to meeting details

### 4. 📅 Daily Digest
**When**: Every morning at 8:00 AM
**Recipient**: All users with upcoming meetings
**Content**:
- List of today's meetings
- List of this week's upcoming meetings
- Quick links to dashboard and meeting details

## Configuration

### SMTP Settings
Email notifications are configured in `/app/backend/.env`:

```env
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=niraj.k.vishwakarma@gmail.com
SMTP_PASSWORD=ynqv ocdz zauh iirc
SMTP_FROM=niraj.k.vishwakarma@gmail.com
SMTP_USE_TLS=true
```

### Enable/Disable Emails
Set `EMAIL_ENABLED=false` to disable all email notifications (useful for testing).

## Technical Implementation

### Files Added
1. **`/app/backend/utils/email.py`** - Email sending utilities
2. **`/app/backend/templates/emails/`** - HTML email templates
   - `meeting_invite.html`
   - `response_change.html`
   - `meeting_reminder.html`
   - `daily_digest.html`
3. **`/app/backend/scheduler.py`** - Background task scheduler

### Backend Changes
- **`server.py`**: Added email triggers to meeting creation and response endpoints
- Integrated email utilities for instant notifications
- Added background scheduler for reminders and daily digest

### Email Templates
All email templates are responsive HTML with:
- Mobile-friendly design
- Clear call-to-action buttons
- Professional branding (MedMeet)
- Consistent color scheme

## Testing Email Integration

### Test Meeting Invite Email
1. Log in as an organizer
2. Create a new meeting
3. Add participants
4. Participants should receive invitation emails

### Test Response Alert Email
1. Log in as a participant
2. Accept or decline a meeting invitation
3. Organizer should receive response notification

### Test Meeting Reminders
Reminders are sent automatically:
- 24h reminder: Check for meetings tomorrow
- 1h reminder: Check for meetings in the next hour

### Test Daily Digest
- Runs automatically every morning at 8:00 AM
- Users with meetings today or this week will receive the digest

## Manual Testing

### Send Test Email (Python)
```python
from utils.email import send_email

result = send_email(
    to_email="test@example.com",
    subject="Test Email",
    html_content="<h1>This is a test</h1>"
)
print(f"Email sent: {result}")
```

### Check Email Logs
```bash
# Check backend logs for email sending
tail -f /var/log/supervisor/backend.out.log | grep "Email"

# Check scheduler logs
tail -f /var/log/supervisor/email_scheduler.out.log
```

## Troubleshooting

### Emails Not Sending
1. **Check SMTP credentials**:
   ```bash
   cat /app/backend/.env | grep SMTP
   ```
   
2. **Test SMTP connection**:
   ```bash
   cd /app/backend
   python -c "from utils.email import send_email; print(send_email('test@example.com', 'Test', '<p>Test</p>'))"
   ```

3. **Check logs**:
   ```bash
   tail -n 50 /var/log/supervisor/backend.out.log | grep -i email
   ```

### Gmail App Password Issues
If using Gmail, ensure:
- 2-Factor Authentication is enabled
- App Password is correctly generated
- App Password is used (not regular password)

### Email Delivery Delays
- Check spam/junk folder
- Some email providers may delay emails by a few minutes
- Check email provider's sending limits

## Production Considerations

### Email Rate Limiting
Current implementation sends emails immediately. For large deployments:
- Implement email queue (e.g., Celery, Redis Queue)
- Batch email sending
- Add rate limiting

### Email Templates
Customize templates in `/app/backend/templates/emails/` to:
- Update branding colors
- Add hospital logo
- Modify email content
- Change button styles

### Monitoring
Monitor email delivery:
- Track email send success/failure rates
- Log all email attempts
- Set up alerts for SMTP failures

## Future Enhancements
- [ ] Email preferences page (users can enable/disable specific notifications)
- [ ] Unsubscribe links
- [ ] Email delivery tracking
- [ ] Rich text email editor
- [ ] Email templates customization UI
- [ ] Multiple language support
- [ ] Email analytics dashboard

---

**Last Updated**: March 1, 2026  
**Version**: 1.0  
**Status**: ✅ Active and Working
