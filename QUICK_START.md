# 🚀 Quick Start Guide

Get MedMeet up and running in 5 minutes!

---

## 🎯 Prerequisites

Choose one of the following setups:

### Option A: Docker (Recommended) ⭐
- Docker Desktop installed
- Git (for cloning)

### Option B: Manual Setup
- Python 3.11+
- Node.js 18+
- MongoDB 7.0+
- Yarn package manager

---

## 🐳 Option A: Docker Setup (Fastest)

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/hospital-meeting-scheduler.git
cd hospital-meeting-scheduler
```

### Step 2: Start All Services

```bash
# Make script executable (Linux/Mac)
chmod +x start-docker.sh

# Start everything
./start-docker.sh
```

**Services Starting:**
- 🗄️ MongoDB on port 27017
- 🚀 Backend API on port 8001
- 💻 Frontend on port 3000

### Step 3: Access the Application

Wait ~30 seconds for services to start, then open:

```
🌐 Frontend: http://localhost:3000
📚 API Docs: http://localhost:8001/docs
❤️ Health Check: http://localhost:8001/api/health
```

### Step 4: Login

**Test Account:**
- Email: `organizer@hospital.com`
- Password: `password123`

**Or use Google OAuth:**
- Click "Continue with Google" on login page

---

## 💻 Option B: Manual Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/hospital-meeting-scheduler.git
cd hospital-meeting-scheduler
```

### Step 2: Setup MongoDB

**Using Docker for MongoDB only:**
```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:7.0
```

**Or install MongoDB locally:**
- See [docs/MONGODB_SETUP.md](./docs/MONGODB_SETUP.md) for detailed instructions

### Step 3: Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Linux/Mac:
source venv/bin/activate
# Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

**Edit `backend/.env`:**
```env
MONGO_URL=mongodb://admin:password@localhost:27017
DB_NAME=hospital_meeting_scheduler
JWT_SECRET=your-secret-key-change-in-production
CORS_ORIGINS=http://localhost:3000

# Email configuration (optional)
EMAIL_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Owner email for feedback
OWNER_EMAIL=Niraj.K.Vishwakarma@gmail.com
```

**Start backend:**
```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

Backend will be running at: http://localhost:8001

### Step 4: Setup Frontend

**Open a new terminal:**

```bash
cd frontend

# Install dependencies
yarn install

# Create .env file
cp .env.example .env
```

**Edit `frontend/.env`:**
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

**Start frontend:**
```bash
yarn start
```

Frontend will automatically open at: http://localhost:3000

---

## ✅ Verify Installation

### 1. Check Backend Health

```bash
curl http://localhost:8001/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-04-06T12:00:00Z"
}
```

### 2. Check Frontend

Open http://localhost:3000 - you should see the login page.

### 3. Test Login

Use these credentials:
- Email: `organizer@hospital.com`
- Password: `password123`

You should be redirected to the dashboard.

---

## 🎨 What's Next?

### Explore the Application

1. **Dashboard** - View statistics and upcoming meetings
2. **Meetings** - Create your first meeting using the wizard
3. **Patients** - Add patient records
4. **Participants** - Manage hospital staff
5. **Profile** - Update your information

### Create Your First Meeting

1. Click **"New Meeting"** from dashboard
2. Follow the 4-step wizard:
   - Step 1: Basic details (title, date, time)
   - Step 2: Add participants
   - Step 3: Add patients
   - Step 4: Create agenda
3. Click **"Create Meeting"**

### Configure Email Notifications (Optional)

1. Get Gmail App Password:
   - Go to Google Account → Security
   - Enable 2-Step Verification
   - Generate App Password

2. Update `backend/.env`:
   ```env
   EMAIL_ENABLED=true
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-16-digit-app-password
   ```

3. Restart backend

---

## 🛠️ Common Issues & Solutions

### Issue: "Connection refused" on http://localhost:3000

**Solution:**
```bash
# Check if frontend is running
lsof -i :3000

# If not running, start it
cd frontend
yarn start
```

### Issue: Backend shows "Database connection failed"

**Solution:**
```bash
# Check if MongoDB is running
docker ps | grep mongo

# Or check MongoDB status
# Linux: sudo systemctl status mongod
# Mac: brew services list
# Windows: Check Services app

# Restart MongoDB
docker restart mongodb
```

### Issue: "Module not found" errors

**Solution:**
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
rm -rf node_modules
yarn install
```

### Issue: CORS errors in browser console

**Solution:**

Check `backend/.env`:
```env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

Check `frontend/.env`:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

Restart both services after changes.

### Issue: "Port already in use"

**Solution:**
```bash
# Find process using port (Linux/Mac)
lsof -i :8001  # Backend
lsof -i :3000  # Frontend

# Kill process
kill -9 <PID>

# Or use different ports
# Backend: uvicorn server:app --port 8002
# Frontend: PORT=3001 yarn start
```

---

## 🔄 Stopping Services

### Docker Setup

```bash
# Stop all services
docker-compose down

# Stop and remove data
docker-compose down -v
```

### Manual Setup

```bash
# Stop backend: Ctrl+C in backend terminal
# Stop frontend: Ctrl+C in frontend terminal

# Stop MongoDB (Docker)
docker stop mongodb
```

---

## 📚 Additional Resources

- **Full Documentation:** [README.md](../README.md)
- **Features Guide:** [docs/FEATURES.md](./docs/FEATURES.md)
- **API Reference:** [docs/API_REFERENCE.md](./docs/API_REFERENCE.md)
- **Deployment Guide:** [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)
- **Contributing:** [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)

---

## 🆘 Need Help?

- **GitHub Issues:** [Create an issue](https://github.com/yourusername/repo/issues)
- **Email:** Niraj.K.Vishwakarma@gmail.com
- **In-App Feedback:** Use the feedback form in Profile page

---

## 🎉 Success!

You're all set! Explore MedMeet and start managing your hospital meetings efficiently.

**Default Test Users:**
- `organizer@hospital.com` / `password123` (Full access)
- `doctor@hospital.com` / `password123` (Doctor access)

---

**Last Updated:** April 6, 2026 | MedMeet v2.0.0
