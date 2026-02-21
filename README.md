# 🏥 Hospital General Meeting Scheduler

A comprehensive web-based application for managing hospital meetings, patient cases, and clinical decision-making.

## 📋 Overview

This application enables hospitals to:
- Schedule and manage multi-disciplinary team meetings
- Review patient cases with attached medical records
- Log clinical decisions and action plans
- Invite doctors and manage meeting participants
- Track meeting agendas and outcomes

**Tech Stack:**
- **Frontend**: React 18, TailwindCSS, Shadcn UI
- **Backend**: Python FastAPI, SQLAlchemy
- **Database**: MySQL 8.0
- **Authentication**: JWT + Google OAuth

---

## 🚀 Quick Start for Local Development

### Prerequisites
- Python 3.8+
- Node.js 16+
- MySQL Server 8.0
- Git

### 30-Second Setup

```bash
# 1. Start MySQL
net start MySQL80

# 2. Initialize Database
cd database
mysql -u root -p < ddl.sql

# 3. Start Backend (Terminal 1)
cd backend
python -m venv venv
venv\Scripts\activate  # On Windows
# source venv/bin/activate  # On Mac/Linux
pip install -r requirements.txt
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8001

# 4. Configure Frontend
# Edit frontend/.env:
# REACT_APP_BACKEND_URL=http://localhost:8001

# 5. Start Frontend (Terminal 2)
cd frontend
npm install
npm start
```

**Open**: http://localhost:3000

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **[LOCAL_SETUP_GUIDE.md](LOCAL_SETUP_GUIDE.md)** | Complete step-by-step setup instructions for Windows |
| **[QUICK_START.md](QUICK_START.md)** | Quick reference for daily development workflow |
| **[test_local_mysql.md](test_local_mysql.md)** | Comprehensive testing guide with all test cases |
| **[memory/PRD.md](memory/PRD.md)** | Product Requirements Document |

---

## 🗄️ Database Setup

### Method 1: Automated (Recommended)
The database schema is automatically created when the backend starts (if tables don't exist).

### Method 2: Manual
```bash
mysql -u root -p
# Enter password: 12345678

CREATE DATABASE Hospital_General_Meeting_Scheduler_DB;
USE Hospital_General_Meeting_Scheduler_DB;
source database/ddl.sql;
```

### Verify Database
```sql
SHOW TABLES;
-- Expected: users, patients, meetings, meeting_participants, 
--           meeting_patients, agenda_items, decision_logs, 
--           file_attachments, user_sessions
```

---

## 🔧 Configuration

### Backend Configuration (`backend/.env`)
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

### Frontend Configuration (`frontend/.env`)
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## 🎯 Key Features

### ✅ User Management
- Email/password authentication with JWT
- Google OAuth social login
- Role-based access (Organizer, Doctor, Admin)

### ✅ Patient Management
- Complete patient CRUD operations
- Patient history tracking
- Search and filter capabilities
- Clinical information storage

### ✅ Meeting Management
- 4-step meeting creation wizard
- Schedule with date, time, location
- Video meeting link integration (MS Teams)
- Add participants and patients
- Agenda item planning

### ✅ Case Room (Meeting Detail Page)
- **Overview**: Meeting details and participant list
- **Patients**: Patient information and clinical questions
- **Agenda**: Meeting agenda with estimated durations
- **Files**: Upload/download medical records (PDF, images)
- **Decisions**: Log clinical decisions and action plans

### ✅ Participant Management
- Add registered doctors to meetings
- Invite new doctors by email
- Remove participants
- Track response status (pending/accepted/declined)

### ✅ Dashboard
- Upcoming meetings overview
- Pending invitations count
- Total active patients
- This week's meeting count

---

## 🧪 Testing

### Quick Health Check
```bash
# Backend
curl http://localhost:8001/api/health
# Expected: {"status": "healthy", "database": "MySQL connected"}

# Frontend
curl http://localhost:3000
# Expected: HTML response
```

### Comprehensive Testing
See **[test_local_mysql.md](test_local_mysql.md)** for:
- Complete API test suite
- Database verification queries
- Frontend manual testing checklist
- Success criteria

### Test Credentials
```
Email: test@test.com
Password: password
```

---

## 📁 Project Structure

```
/app
├── backend/
│   ├── server.py              # FastAPI app with all routes
│   ├── .env                   # Backend configuration
│   ├── requirements.txt       # Python dependencies
│   └── uploads/               # File storage
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   └── ui/           # Shadcn components
│   │   ├── context/          # React context providers
│   │   │   └── AuthContext.js
│   │   ├── lib/
│   │   │   └── api.js        # Axios API client
│   │   ├── pages/            # Page components
│   │   │   ├── LoginPage.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── PatientsPage.js
│   │   │   ├── MeetingsPage.js
│   │   │   ├── MeetingWizardPage.js
│   │   │   └── MeetingDetailPage.js
│   │   ├── App.js            # Routes
│   │   └── index.js          # Entry point
│   ├── .env                   # Frontend configuration
│   └── package.json
├── database/
│   └── ddl.sql               # MySQL schema
└── memory/
    └── PRD.md                # Product requirements
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/google` - Google OAuth callback

### Users
- `GET /api/users` - Get all users (for adding participants)

### Patients
- `GET /api/patients` - Get all patients
- `POST /api/patients` - Create patient
- `GET /api/patients/{id}` - Get patient details
- `PUT /api/patients/{id}` - Update patient
- `DELETE /api/patients/{id}` - Soft delete patient

### Meetings
- `GET /api/meetings` - Get all meetings
- `POST /api/meetings` - Create meeting
- `GET /api/meetings/{id}` - Get meeting details
- `PUT /api/meetings/{id}` - Update meeting

### Participants
- `POST /api/meetings/{id}/participants` - Add participant
- `DELETE /api/meetings/{id}/participants/{user_id}` - Remove participant
- `POST /api/meetings/{id}/invite` - Invite by email

### Files & Decisions
- `POST /api/meetings/{id}/files` - Upload file
- `GET /api/files/{id}` - Download file
- `POST /api/meetings/{id}/decisions` - Log decision
- `PUT /api/meetings/{id}/decisions/{id}` - Update decision

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Health
- `GET /api/health` - Health check

---

## 🚨 Troubleshooting

### Backend Connection Issues
**Problem**: `Can't connect to MySQL server`

**Solution**:
1. Verify MySQL is running: `net start MySQL80`
2. Test connection: `mysql -u root -p -h 127.0.0.1`
3. Check credentials in `backend/.env`

### Frontend Can't Connect to Backend
**Problem**: Network errors in browser console

**Solution**:
1. Verify backend is running on port 8001
2. Check `frontend/.env` has `REACT_APP_BACKEND_URL=http://localhost:8001`
3. Restart frontend after .env changes

### Module Not Found
**Problem**: `ModuleNotFoundError` when starting backend

**Solution**:
```bash
cd backend
pip install -r requirements.txt
```

### Port Already in Use
**Problem**: `Address already in use: 8001`

**Solution**:
```bash
# Windows
netstat -ano | findstr :8001
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:8001 | xargs kill -9
```

---

## 🔐 Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ Token expiration (24 hours)
- ✅ SQL injection protection (parameterized queries)
- ✅ CORS configuration
- ✅ No password hash exposure in API responses

---

## 🚀 Future Enhancements

### Planned Features
- [ ] **Email Notifications** - SMTP integration for meeting invites
- [ ] **Auto-generated Summaries** - Post-meeting summary generation
- [ ] **Admin Staff Role** - Additional user role with permissions
- [ ] **Calendar Integration** - Sync with Google Calendar
- [ ] **Cloud Storage** - Move files to S3/Cloudinary
- [ ] **Real-time Updates** - WebSocket support for live updates
- [ ] **Notifications** - In-app notification system
- [ ] **Advanced Search** - Full-text search for patients and meetings
- [ ] **Reporting** - Meeting analytics and reports

### Code Improvements
- [ ] **Refactor Backend** - Split monolithic `server.py` into:
  - `models/` - Database models
  - `routes/` - API endpoints
  - `schemas/` - Pydantic schemas
  - `services/` - Business logic
  - `database.py` - DB connection
- [ ] **Add Tests** - Unit and integration tests
- [ ] **API Documentation** - Enhanced Swagger docs
- [ ] **Type Hints** - Complete type annotations

---

## 📞 Support

For detailed setup and testing instructions, please refer to:
- **Setup**: [LOCAL_SETUP_GUIDE.md](LOCAL_SETUP_GUIDE.md)
- **Testing**: [test_local_mysql.md](test_local_mysql.md)
- **Quick Reference**: [QUICK_START.md](QUICK_START.md)

---

## 📄 License

This is a proprietary application for hospital use.

---

**Version**: 2.0 (MySQL Migration Complete)  
**Last Updated**: February 21, 2026
