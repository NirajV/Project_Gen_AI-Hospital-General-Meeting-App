# 🏥 Hospital Meeting App - Local Setup Guide (Windows)

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your Windows machine:

1. **Python 3.8+** - [Download](https://www.python.org/downloads/)
2. **Node.js 16+** and npm - [Download](https://nodejs.org/)
3. **MySQL Server 8.0** - [Download](https://dev.mysql.com/downloads/mysql/)
4. **Git** - [Download](https://git-scm.com/downloads)

---

## 🗄️ Part 1: Database Setup

### Step 1: Start MySQL Server

1. Open **Services** (Win + R, type `services.msc`)
2. Find **MySQL80** service and ensure it's **Running**
3. Or start it via command line:
   ```cmd
   net start MySQL80
   ```

### Step 2: Create Database and Tables

1. Open MySQL Command Line Client or MySQL Workbench
2. Login with your credentials (root / 12345678)
3. Run the DDL script:

```cmd
mysql -u root -p < database/ddl.sql
```

**OR** manually execute the SQL file located at: `/app/database/ddl.sql`

### Step 3: Verify Database Creation

```sql
SHOW DATABASES;
USE Hospital_General_Meeting_Scheduler_DB;
SHOW TABLES;
```

You should see tables like: `users`, `patients`, `meetings`, `meeting_participants`, etc.

---

## 🔧 Part 2: Backend Setup

### Step 1: Navigate to Backend Directory

```cmd
cd backend
```

### Step 2: Create Virtual Environment (Recommended)

```cmd
python -m venv venv
venv\Scripts\activate
```

### Step 3: Install Python Dependencies

```cmd
pip install -r requirements.txt
```

### Step 4: Verify Environment Variables

Check `backend/.env` file contains:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=12345678
MYSQL_DATABASE=Hospital_General_Meeting_Scheduler_DB
JWT_SECRET=hospital_meeting_scheduler_secret_key_2025
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
UPLOAD_DIR=./uploads
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Step 5: Start Backend Server

```cmd
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Application startup complete.
```

### Step 6: Test Backend Health

Open a new terminal and test:

```cmd
curl http://localhost:8001/api/health
```

Expected response:
```json
{"status": "healthy", "database": "MySQL connected"}
```

---

## ⚛️ Part 3: Frontend Setup

### Step 1: Navigate to Frontend Directory

Open a **NEW terminal** (keep backend running):

```cmd
cd frontend
```

### Step 2: Install Node Dependencies

```cmd
npm install
```

**Note:** If you encounter errors, try:
```cmd
npm install --legacy-peer-deps
```

### Step 3: Update Environment Variables

Edit `frontend/.env` to point to your local backend:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=3000
ENABLE_HEALTH_CHECK=false
```

### Step 4: Start Frontend Development Server

```cmd
npm start
```

The app should automatically open in your browser at: **http://localhost:3000**

---

## 🧪 Part 4: Testing the Application

### 4.1 Test User Registration & Login

#### Register a New User

```cmd
curl -X POST http://localhost:8001/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"doctor@hospital.com\",\"name\":\"Dr. Smith\",\"password\":\"password123\",\"specialty\":\"Cardiology\"}"
```

Expected response:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": "...",
    "email": "doctor@hospital.com",
    "name": "Dr. Smith"
  }
}
```

**Save the `access_token`** - you'll need it for authenticated requests!

#### Login with Existing User

```cmd
curl -X POST http://localhost:8001/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"doctor@hospital.com\",\"password\":\"password123\"}"
```

### 4.2 Test Patient Management

#### Create a Patient

```cmd
set TOKEN=YOUR_ACCESS_TOKEN_HERE

curl -X POST http://localhost:8001/api/patients ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -d "{\"first_name\":\"John\",\"last_name\":\"Doe\",\"date_of_birth\":\"1980-05-15\",\"gender\":\"male\",\"primary_diagnosis\":\"Hypertension\"}"
```

#### Get All Patients

```cmd
curl -X GET http://localhost:8001/api/patients ^
  -H "Authorization: Bearer %TOKEN%"
```

### 4.3 Test Meeting Creation

```cmd
curl -X POST http://localhost:8001/api/meetings ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -d "{\"title\":\"Cardiology Review Meeting\",\"description\":\"Reviewing critical cases\",\"meeting_date\":\"2026-02-25\",\"start_time\":\"10:00:00\",\"end_time\":\"11:30:00\",\"meeting_type\":\"video\",\"participant_ids\":[],\"patient_ids\":[]}"
```

### 4.4 Test Dashboard Stats

```cmd
curl -X GET http://localhost:8001/api/dashboard/stats ^
  -H "Authorization: Bearer %TOKEN%"
```

Expected response:
```json
{
  "upcoming_meetings": 1,
  "pending_invites": 0,
  "total_patients": 1,
  "meetings_this_week": 1
}
```

---

## 🌐 Part 5: Frontend Testing (Manual)

### Test Flow 1: Complete User Journey

1. **Open browser**: http://localhost:3000
2. **Register/Login**: Create an account or login
3. **Dashboard**: Verify you can see the dashboard with stats
4. **Create Patient**: 
   - Go to **Patients** → **New Patient**
   - Fill the form and submit
5. **Create Meeting**:
   - Go to **Dashboard** → **New Meeting**
   - Follow the 4-step wizard:
     - Step 1: Basic Details
     - Step 2: Participants (add doctors or invite by email)
     - Step 3: Patients (select existing or add new)
     - Step 4: Agenda Items
   - Submit and verify meeting is created
6. **View Meeting Details**:
   - Click on a meeting from the dashboard or meetings list
   - Navigate through tabs: Overview, Patients, Agenda, Files, Decisions
7. **Test Participant Management**:
   - From Meeting Detail page
   - Add/Remove participants
   - Invite new doctors by email

### Test Flow 2: Google OAuth Login

1. Click **"Sign in with Google"** on login page
2. Complete OAuth flow
3. Verify you're redirected back and logged in

---

## 📊 Part 6: Database Verification

After testing, verify data in MySQL:

```sql
USE Hospital_General_Meeting_Scheduler_DB;

-- Check users
SELECT id, email, name, specialty, role FROM users;

-- Check patients
SELECT id, first_name, last_name, primary_diagnosis FROM patients;

-- Check meetings
SELECT id, title, meeting_date, start_time, organizer_id FROM meetings;

-- Check meeting participants
SELECT mp.meeting_id, u.name, mp.response_status 
FROM meeting_participants mp 
JOIN users u ON mp.user_id = u.id;
```

---

## 🚨 Troubleshooting

### Issue 1: Backend Can't Connect to MySQL

**Error**: `(2003, "Can't connect to MySQL server on '127.0.0.1'")`

**Solutions**:
1. Verify MySQL service is running
2. Check MySQL credentials in `backend/.env`
3. Test MySQL connection:
   ```cmd
   mysql -u root -p -h 127.0.0.1
   ```

### Issue 2: Module Not Found Errors

**Error**: `ModuleNotFoundError: No module named 'fastapi'`

**Solution**:
```cmd
cd backend
pip install -r requirements.txt
```

### Issue 3: Frontend Can't Connect to Backend

**Error**: Network error or CORS issues

**Solutions**:
1. Ensure backend is running on port 8001
2. Verify `frontend/.env` has:
   ```
   REACT_APP_BACKEND_URL=http://localhost:8001
   ```
3. Check browser console for specific error messages

### Issue 4: Port Already in Use

**Error**: `Address already in use: 8001` or `3000`

**Solutions**:
```cmd
# Find and kill process on port 8001 (Backend)
netstat -ano | findstr :8001
taskkill /PID <PID_NUMBER> /F

# Find and kill process on port 3000 (Frontend)
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

### Issue 5: Database Tables Not Created

**Solution**:
Run the DDL script manually:
```cmd
cd database
mysql -u root -p Hospital_General_Meeting_Scheduler_DB < ddl.sql
```

---

## 📁 Project Structure

```
/app
├── backend/
│   ├── server.py           # FastAPI application (all routes + models)
│   ├── .env                # Environment variables
│   ├── requirements.txt    # Python dependencies
│   └── uploads/            # File storage directory
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── context/        # AuthContext for user session
│   │   ├── lib/api.js      # Axios API client
│   │   └── App.js          # Main app component
│   ├── .env                # Frontend environment variables
│   └── package.json        # Node dependencies
└── database/
    └── ddl.sql             # MySQL database schema
```

---

## 🎯 Key Features to Test

✅ **Authentication**
- JWT-based email/password login
- Google OAuth social login
- Session management

✅ **Dashboard**
- Meeting statistics
- Quick actions
- Upcoming meetings overview

✅ **Patient Management**
- CRUD operations
- Patient history
- Search and filter

✅ **Meeting Management**
- Multi-step creation wizard
- Add existing doctors or invite new ones by email
- Add existing patients or create new ones inline
- Schedule meetings with date/time
- Video meeting link integration (MS Teams)

✅ **Case Room (Meeting Detail)**
- Overview tab with meeting details
- Patients tab with case-specific info
- Agenda items management
- File attachments (upload/download/delete)
- Decision logs
- Participant management

✅ **Participant Management**
- Add registered doctors to meetings
- Invite new doctors by email
- Remove participants
- Track response status

---

## 🔐 Security Notes

- Passwords are hashed using bcrypt
- JWT tokens expire after 24 hours (configurable)
- File uploads are validated
- SQL injection protection via parameterized queries
- CORS is configured for local development

---

## 🚀 Production Deployment (Future)

When deploying to production:

1. **Update `.env` files** with production values
2. **Enable HTTPS** for secure communication
3. **Configure production MySQL server** (not localhost)
4. **Set strong JWT secret** (use a secure random string)
5. **Configure SMTP** for email invitations
6. **Use cloud storage** for file uploads (S3, Cloudinary)
7. **Set up proper logging and monitoring**

---

## ❓ Need Help?

If you encounter any issues during setup:

1. Check the logs:
   - Backend: Terminal where uvicorn is running
   - Frontend: Browser console (F12)
   - MySQL: MySQL error log

2. Common fix: Restart both servers after changing `.env` files

3. Verify all services are running:
   - MySQL Server
   - Backend (port 8001)
   - Frontend (port 3000)

---

## ✨ Next Steps (Future Enhancements)

These features are planned but not yet implemented:

- 📧 **Email Invitations** - SMTP integration for sending meeting invites
- 📄 **Auto-generated Meeting Summaries** - Post-meeting summary generation
- 👥 **Admin Staff Role** - Additional user role with specific permissions
- 📅 **Calendar Integration** - Sync meetings with Google Calendar
- ☁️ **Cloud Storage** - Move file uploads to Cloudinary/S3

---

**Last Updated**: February 21, 2026  
**Version**: 2.0 (MySQL Migration Complete)
