# 🏥 MedMeet - Hospital Case Meeting Scheduler

> A comprehensive web application for managing hospital case meetings, patient records, and medical team collaboration.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Tech Stack](https://img.shields.io/badge/stack-React%20%7C%20FastAPI%20%7C%20MongoDB-green)
![Status](https://img.shields.io/badge/status-Production%20Ready-brightgreen)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Demo Credentials](#demo-credentials)
- [Documentation](#documentation)
- [Project Structure](#project-structure)
- [API Overview](#api-overview)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

**MedMeet** is a modern, full-stack web application designed for healthcare professionals to efficiently manage hospital case meetings, coordinate medical teams, and maintain comprehensive patient records. Built with a focus on user experience and clinical workflows.

### Key Highlights

- **🎨 Clinical Zen UI** - Color-coded interface (Teal for Meetings, Amber for Patients, Purple for Participants, Blue for Dashboard)
- **📧 Automated Notifications** - Meeting invites, reminders, and response alerts via email
- **📄 PDF Generation** - Auto-generate post-meeting summaries with treatment plans
- **👥 Role-Based Access** - Organizer, Doctor, Nurse, Admin roles with granular permissions
- **🔐 Dual Authentication** - Email/password login + Google OAuth integration
- **📱 Responsive Design** - Mobile-friendly interface built with Tailwind CSS and Shadcn UI
- **🐳 Docker Ready** - One-command deployment with Docker Compose

---

## ✨ Features

### Meeting Management
- ✅ **Meeting Creation Wizard** - Multi-step form for creating structured meetings
- ✅ **Participant Invitations** - Invite existing staff or new external participants via email
- ✅ **Patient Association** - Link patients to meetings with clinical questions
- ✅ **Agenda Builder** - Create detailed agendas with time estimates
- ✅ **File Uploads** - Attach medical records, images, and documents
- ✅ **Decision Logging** - Record treatment decisions with follow-up tracking
- ✅ **Response System** - Accept/Maybe/Decline responses from dashboard
- ✅ **Meeting Status Tracking** - Scheduled → In Progress → Completed → Cancelled

### Patient Management
- ✅ **Comprehensive Patient Records** - Full demographic and medical history
- ✅ **Treatment Plans** - Track treatment recommendations by meeting
- ✅ **Document Management** - Upload and organize patient files
- ✅ **Meeting History** - View all meetings associated with a patient
- ✅ **Search & Filter** - Quick patient lookup by name, MRN, or diagnosis

### Team Collaboration
- ✅ **Participants Directory** - View and manage all hospital staff
- ✅ **Role Management** - Change user roles (Organizer/Admin only)
- ✅ **Create Participants** - Add new staff members to the system
- ✅ **Response Tracking** - Monitor meeting attendance and responses

### Automation & Notifications
- ✅ **Email Notifications** - Automated meeting invites and reminders
- ✅ **PDF Summaries** - Generate post-meeting summary documents
- ✅ **Treatment Plan Tracking** - 7-day edit window for treatment plans
- ✅ **Dashboard Analytics** - Real-time stats and upcoming meetings

### Security & Access Control
- ✅ **JWT Authentication** - Secure token-based authentication
- ✅ **Google OAuth** - Emergent-managed social login
- ✅ **Password Management** - Change password, reset functionality
- ✅ **Role-Based Permissions** - Granular access control by user role
- ✅ **User Feedback System** - Submit feedback to application owner

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn UI** - High-quality accessible component library
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Lucide Icons** - Icon library

### Backend
- **FastAPI** - High-performance Python web framework
- **MongoDB** - NoSQL document database
- **Motor** - Async MongoDB driver
- **Pydantic** - Data validation
- **JWT** - JSON Web Token authentication
- **Bcrypt** - Password hashing
- **ReportLab** - PDF generation
- **SMTP** - Email notifications

### DevOps
- **Docker & Docker Compose** - Containerization
- **Supervisor** - Process management
- **Nginx** - Reverse proxy (production)
- **Git** - Version control

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose installed
- Git (for cloning)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/hospital-meeting-scheduler.git
cd hospital-meeting-scheduler

# Start all services (Frontend, Backend, MongoDB)
./start-docker.sh

# Wait for services to start (~30 seconds)
# Access the application at: http://localhost:3000
```

### Manual Setup (Without Docker)

See [QUICK_START.md](./QUICK_START.md) for detailed manual setup instructions.

---

## 🔑 Demo Credentials

### Production URL
```
https://hospital-case-room.preview.emergentagent.com
```

### Test Accounts

**Organizer Account (Full Access):**
- **Email:** `organizer@hospital.com`
- **Password:** `password123`
- **Role:** Organizer
- **Permissions:** Create meetings, manage participants, change roles

**Doctor Account:**
- **Email:** `doctor@hospital.com`
- **Password:** `password123`
- **Role:** Doctor
- **Permissions:** View meetings, respond to invites, add patients

**Google OAuth:**
- Click "Continue with Google" on login page
- Use any Google account (Emergent-managed authentication)

---

## 📚 Documentation

### User Guides
- [Quick Start Guide](./QUICK_START.md) - Get started in 5 minutes
- [Features Documentation](./docs/FEATURES.md) - Complete feature list
- [API Reference](./docs/API_REFERENCE.md) - REST API documentation

### Developer Guides
- [Deployment Guide](./docs/DEPLOYMENT.md) - Docker & production deployment
- [Database Schema](./docs/DATABASE.md) - MongoDB collections and relationships
- [Contributing Guide](./docs/CONTRIBUTING.md) - Development workflow

### Integration Guides
- [Email Integration](./docs/EMAIL_INTEGRATION.md) - SMTP setup
- [PDF Generation](./docs/PDF_GENERATION.md) - Post-meeting summaries
- [Teams Integration](./docs/TEAMS_INTEGRATION.md) - Microsoft Teams integration (planned)

### Design & Architecture
- [UI Guidelines](./docs/UI_GUIDELINES.md) - Design system and color scheme
- [Roadmap](./docs/ROADMAP.md) - Future enhancements

---

## 📁 Project Structure

```
/app/
├── backend/                # FastAPI backend
│   ├── server.py          # Main API server (1,690 lines)
│   ├── scheduler.py       # Background task scheduler
│   ├── requirements.txt   # Python dependencies
│   ├── .env              # Environment variables
│   ├── utils/            # Utility modules
│   │   ├── email.py      # Email sending
│   │   └── pdf_generator.py  # PDF generation
│   ├── templates/        # Email templates
│   ├── tests/           # Backend tests
│   └── uploads/         # File storage
│
├── frontend/             # React frontend
│   ├── src/
│   │   ├── pages/       # Page components
│   │   │   ├── DashboardPage.js
│   │   │   ├── MeetingsPage.js
│   │   │   ├── MeetingDetailPage.js (2,100+ lines)
│   │   │   ├── PatientsPage.js
│   │   │   ├── PatientDetailPage.js
│   │   │   ├── ParticipantsPage.js
│   │   │   └── ProfilePage.js
│   │   ├── components/  # Reusable components
│   │   │   ├── Layout.js
│   │   │   └── ui/      # Shadcn UI components
│   │   ├── context/     # React context
│   │   │   └── AuthContext.js
│   │   └── lib/         # Utilities
│   │       └── api.js   # API client
│   ├── package.json     # Node dependencies
│   └── .env            # Frontend environment
│
├── docs/                # Documentation
│   ├── FEATURES.md
│   ├── API_REFERENCE.md
│   ├── DEPLOYMENT.md
│   ├── DATABASE.md
│   ├── CONTRIBUTING.md
│   └── ...
│
├── test_reports/        # Test results
├── memory/             # Agent memory (PRD)
├── docker-compose.yml  # Docker orchestration
├── start-docker.sh    # Startup script
├── README.md          # This file
└── QUICK_START.md     # Quick start guide
```

---

## 🔌 API Overview

### Base URL
```
Production: https://hospital-case-room.preview.emergentagent.com/api
Local: http://localhost:8001/api
```

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/session` - Process OAuth session
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password
- `POST /api/feedback` - Submit user feedback

#### Meetings
- `GET /api/meetings` - List all meetings
- `POST /api/meetings` - Create new meeting
- `GET /api/meetings/{id}` - Get meeting details
- `PUT /api/meetings/{id}` - Update meeting
- `DELETE /api/meetings/{id}` - Delete meeting
- `POST /api/meetings/{id}/summary` - Generate PDF summary

#### Patients
- `GET /api/patients` - List all patients
- `POST /api/patients` - Create new patient
- `GET /api/patients/{id}` - Get patient details
- `PUT /api/patients/{id}` - Update patient
- `DELETE /api/patients/{id}` - Delete patient

#### Participants
- `GET /api/users` - List all users
- `PUT /api/users/{id}/role` - Change user role (Organizer only)
- `POST /api/meetings/{id}/participants` - Add participant to meeting
- `PUT /api/meetings/{id}/participants/{user_id}/response` - Update response

#### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### API Documentation
Full interactive API documentation available at:
```
http://localhost:8001/docs (Swagger UI)
http://localhost:8001/redoc (ReDoc)
```

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for:
- Development setup
- Code style guidelines
- Pull request process
- Testing requirements

### Quick Development Setup

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8001

# Frontend
cd frontend
yarn install
yarn start
```

---

## 🐛 Known Issues & Future Enhancements

### Current Limitations
- **Large Component Files** - `MeetingDetailPage.js` (2,100+ lines) needs refactoring
- **Monolithic Backend** - `server.py` (1,690 lines) should be split into modules
- **No Real-time Updates** - Manual refresh needed to see updates
- **Local File Storage** - Files stored locally, should migrate to cloud storage (S3)

### Planned Features (v2.1)
- 🔄 **Code Refactoring** - Break down large files into smaller modules
- 📧 **Email Scheduler** - Activate automated reminder system
- 👨‍💼 **Admin Dashboard** - Dedicated admin panel
- 📅 **Calendar Integration** - Google Calendar & Outlook sync
- 🔔 **Real-time Notifications** - WebSocket support
- ☁️ **Cloud Storage** - Migrate to AWS S3/Cloudinary

See [ROADMAP.md](./docs/ROADMAP.md) for complete future plans.

---

## 📊 Stats

- **Total Files:** ~150
- **Backend Lines:** ~2,000
- **Frontend Lines:** ~8,000
- **API Endpoints:** 30+
- **Database Collections:** 8
- **Test Coverage:** Backend tests available

---

## 📧 Support

For issues, questions, or feedback:

- **Submit Feedback:** Use the feedback form in Profile page (sends to `Niraj.K.Vishwakarma@gmail.com`)
- **GitHub Issues:** [Create an issue](https://github.com/yourusername/repo/issues)
- **Documentation:** Check `/docs` folder for detailed guides

---

## 📄 License

This project is private and proprietary. All rights reserved.

---

## 🙏 Acknowledgments

- **Shadcn UI** - Beautiful component library
- **Tailwind CSS** - Utility-first CSS framework
- **FastAPI** - High-performance Python framework
- **MongoDB** - Flexible NoSQL database
- **Emergent Labs** - Google OAuth integration provider

---

**Built with ❤️ for Healthcare Professionals**

Last Updated: April 2026 | Version 2.0.0
