# 📧 Gmail SMTP Setup Guide - Hospital Meeting Scheduler

## Where Gmail Credentials Are Used

The application uses Gmail SMTP for sending:
- Meeting invitations
- Patient approval notifications
- Password reset emails
- Account setup emails
- Meeting reminders

---

## 📍 Configuration Locations

### 1. For Docker Deployment (LAN Server)

**File:** `/app/.env` (or `.env.docker.example`)

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com          # ← Your Gmail address
SMTP_PASSWORD=your-app-specific-password # ← Gmail App Password (NOT your regular password)
```

---

### 2. For Local Development

**File:** `/app/backend/.env`

```bash
# Email Configuration (same as Docker)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

---

## 🔐 How to Get Gmail App Password

### ⚠️ IMPORTANT: DO NOT use your regular Gmail password!

Google requires **App Passwords** for third-party applications.

### Step-by-Step Guide:

#### **Step 1: Enable 2-Factor Authentication**

1. Go to your Google Account: https://myaccount.google.com/
2. Click **Security** (left sidebar)
3. Under "How you sign in to Google," click **2-Step Verification**
4. Click **Get Started**
5. Follow the prompts to set up 2FA (phone verification)
6. ✅ 2FA must be enabled to create App Passwords

---

#### **Step 2: Create App Password**

1. Go to: https://myaccount.google.com/apppasswords
   
   OR:
   - Google Account → Security
   - Scroll to "How you sign in to Google"
   - Click **App passwords**

2. You may need to sign in again

3. **Select app:** Choose "Mail"

4. **Select device:** Choose "Other (Custom name)"
   - Enter: "Hospital Meeting Scheduler"

5. Click **Generate**

6. Google will show a **16-character password**:
   ```
   Example: abcd efgh ijkl mnop
   ```

7. **COPY THIS PASSWORD** - You won't see it again!

8. Remove spaces when entering in `.env`:
   ```bash
   SMTP_PASSWORD=abcdefghijklmnop
   ```

---

#### **Step 3: Update Configuration**

**For Docker Deployment:**
```bash
# Edit .env file
nano .env

# Update these lines:
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop  # ← App password (no spaces)
```

**For Local Development:**
```bash
# Edit backend/.env
nano backend/.env

# Add or update:
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop
```

**Save and restart:**
```bash
# Docker
docker compose -f docker-compose.mongodb.yml restart backend

# Local development
sudo supervisorctl restart backend
```

---

## 🔍 Where Credentials Are Stored

### Current Setup:

```
Your Application
├── .env                          ← Docker deployment config
│   ├── SMTP_USER=your@gmail.com
│   └── SMTP_PASSWORD=apppassword
│
├── backend/.env                  ← Local development config
│   ├── SMTP_USER=your@gmail.com
│   └── SMTP_PASSWORD=apppassword
│
└── backend/utils/email.py        ← Email sending code
    └── Uses credentials from environment variables
```

---

## 📝 Complete Configuration Example

### **.env file (Root directory):**

```bash
# ==============================================
# EMAIL CONFIGURATION
# ==============================================

# Gmail SMTP server (don't change)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# Your Gmail address
SMTP_USER=hospital.scheduler@gmail.com

# Gmail App Password (16 chars, no spaces)
# Get from: https://myaccount.google.com/apppasswords
SMTP_PASSWORD=abcdefghijklmnop

# Sender name (optional)
SMTP_FROM=hospital.scheduler@gmail.com
```

---

## 🧪 Test Email Configuration

### Method 1: Using Python Script

```bash
# Connect to backend container
docker exec -it hospital_backend bash

# Create test script
cat > test_email.py << 'EOF'
import smtplib
import os
from email.mime.text import MIMEText

# Get credentials from environment
smtp_user = os.environ.get('SMTP_USER')
smtp_password = os.environ.get('SMTP_PASSWORD')

print(f"Testing with: {smtp_user}")

# Create test message
msg = MIMEText("Test email from Hospital Meeting Scheduler")
msg['Subject'] = 'Test Email'
msg['From'] = smtp_user
msg['To'] = smtp_user  # Send to yourself

# Send email
try:
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    server.login(smtp_user, smtp_password)
    server.send_message(msg)
    server.quit()
    print("✓ Email sent successfully!")
except Exception as e:
    print(f"✗ Error: {e}")
EOF

# Run test
python3 test_email.py

# Exit container
exit
```

---

### Method 2: Using curl

```bash
# Test from backend container
docker exec -it hospital_backend bash

# Send test API request (after backend is running)
curl -X POST http://localhost:8001/api/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "feedback_type": "general",
    "subject": "Test Email",
    "message": "Testing email configuration"
  }'
```

---

## ❌ Common Issues & Solutions

### Issue 1: "Username and Password not accepted"

**Causes:**
- Using regular Gmail password instead of App Password
- 2FA not enabled
- App Password has spaces

**Solution:**
```bash
# 1. Enable 2FA on your Google Account
# 2. Generate new App Password at:
#    https://myaccount.google.com/apppasswords
# 3. Copy password WITHOUT spaces
# 4. Update .env file
# 5. Restart backend
```

---

### Issue 2: "Authentication failed"

**Causes:**
- Incorrect username/password
- Typo in credentials
- Gmail account locked

**Solution:**
```bash
# Verify credentials in .env
cat .env | grep SMTP

# Check for spaces or special characters
# Regenerate App Password if needed
```

---

### Issue 3: "Less secure app access"

**Note:** Google removed "Less secure apps" option in May 2022.

**Solution:**
- ✅ Must use App Passwords now
- Cannot use regular password
- 2FA is mandatory

---

### Issue 4: "SMTP connection timeout"

**Causes:**
- Firewall blocking port 587
- Network connectivity issues

**Solution:**
```bash
# Test SMTP connection
telnet smtp.gmail.com 587

# If blocked, check firewall:
sudo ufw status
sudo ufw allow out 587
```

---

### Issue 5: Emails not being sent (no error)

**Check backend logs:**
```bash
docker logs hospital_backend | grep -i email
docker logs hospital_backend | grep -i smtp
```

**Verify configuration:**
```bash
docker exec hospital_backend env | grep SMTP
```

---

## 🔐 Security Best Practices

### 1. Use App Password (Not Regular Password)
```bash
# ✗ WRONG
SMTP_PASSWORD=my_regular_gmail_password

# ✓ CORRECT
SMTP_PASSWORD=abcdefghijklmnop
```

### 2. Keep .env File Secure
```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo "backend/.env" >> .gitignore

# Set proper permissions
chmod 600 .env
chmod 600 backend/.env
```

### 3. Rotate App Passwords Regularly
- Generate new App Password every 3-6 months
- Revoke old passwords at: https://myaccount.google.com/apppasswords

### 4. Backup Credentials Securely
```bash
# Store in password manager (1Password, LastPass, etc.)
# Do NOT commit to Git
# Do NOT share in plain text
```

---

## 📧 Alternative Email Providers

If you don't want to use Gmail:

### SendGrid (Recommended for production)
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=YOUR_SENDGRID_API_KEY
```

### Outlook/Hotmail
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your_password
```

### Custom SMTP Server
```bash
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your_password
```

---

## 📋 Quick Checklist

Before emails will work:

- [ ] 2-Factor Authentication enabled on Gmail
- [ ] App Password generated
- [ ] App Password copied (no spaces)
- [ ] `.env` file updated with SMTP_USER
- [ ] `.env` file updated with SMTP_PASSWORD
- [ ] Backend restarted
- [ ] Test email sent successfully
- [ ] `.env` file secured (not in Git)

---

## 🔍 Verify Current Configuration

### Check if credentials are set:

```bash
# Docker deployment
cat .env | grep SMTP

# Local development
cat backend/.env | grep SMTP

# Check in running container
docker exec hospital_backend env | grep SMTP
```

### Expected output:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=****************
```

---

## 📞 Need Help?

**Gmail App Password Setup:**
- Direct link: https://myaccount.google.com/apppasswords
- Help: https://support.google.com/accounts/answer/185833

**Application Issues:**
- Check backend logs: `docker logs hospital_backend`
- Test email function in code: `backend/utils/email.py`
- Verify environment variables are loaded

---

## 🎯 Summary

**To use Gmail for emails:**

1. **Enable 2FA** on your Google Account
2. **Generate App Password** at https://myaccount.google.com/apppasswords
3. **Update .env file** with your Gmail and App Password
4. **Restart backend** to apply changes
5. **Test** by sending a feedback or invitation

**Configuration file:** `.env` (root) or `backend/.env`
**Required fields:** `SMTP_USER` and `SMTP_PASSWORD`
**Password type:** App Password (16 chars, no spaces)

---

**Last Updated:** April 12, 2026  
**Gmail SMTP:** smtp.gmail.com:587  
**Security:** App Passwords Required
