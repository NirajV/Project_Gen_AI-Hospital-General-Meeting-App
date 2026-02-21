# ⚡ Quick Start Guide - Local Development

## 🎯 30-Second Setup

### Step 1: Start MySQL
```cmd
net start MySQL80
```

### Step 2: Initialize Database
```cmd
cd database
mysql -u root -p12345678 < ddl.sql
```

### Step 3: Start Backend (Terminal 1)
```cmd
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

### Step 4: Configure Frontend
Edit `frontend/.env`:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Step 5: Start Frontend (Terminal 2)
```cmd
cd frontend
npm install
npm start
```

### Step 6: Open Browser
```
http://localhost:3000
```

---

## 🔗 How Frontend Connects to Backend

### Architecture Overview

```
Browser (localhost:3000)
    ↓
React Frontend
    ↓
    API Calls via Axios (frontend/src/lib/api.js)
    ↓
    Uses REACT_APP_BACKEND_URL from .env
    ↓
Backend API (localhost:8001/api/*)
    ↓
MySQL Database (localhost:3306)
```

### API Configuration

**File**: `/app/frontend/src/lib/api.js`

```javascript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Token is automatically added to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Environment Variable Setup

**Local Development** (frontend/.env):
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

**Production/Remote** (frontend/.env):
```env
REACT_APP_BACKEND_URL=https://your-backend-domain.com
```

### Example API Calls

#### 1. Authentication
```javascript
// frontend/src/pages/LoginPage.js
import api from '../lib/api';

// Login
const response = await api.post('/api/auth/login', {
  email: 'doctor@hospital.com',
  password: 'password123'
});

// Save token
localStorage.setItem('token', response.data.access_token);
```

#### 2. Fetch Patients
```javascript
// frontend/src/pages/PatientsPage.js
const response = await api.get('/api/patients');
const patients = response.data;
```

#### 3. Create Meeting
```javascript
// frontend/src/pages/MeetingWizardPage.js
const response = await api.post('/api/meetings', {
  title: 'Cardiology Review',
  meeting_date: '2026-03-01',
  start_time: '10:00:00',
  end_time: '11:00:00',
  participant_ids: ['user-id-1', 'user-id-2'],
  patient_ids: ['patient-id-1']
});
```

---

## 🔧 Troubleshooting Connection Issues

### Issue 1: CORS Errors

**Symptom**: Browser console shows CORS policy errors

**Solution**: Verify `backend/.env` has:
```env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

Restart backend after changing .env

### Issue 2: Network Error

**Symptom**: "Network Error" in browser console

**Check**:
1. Backend is running: `http://localhost:8001/api/health`
2. Frontend .env has correct URL
3. No firewall blocking port 8001

### Issue 3: 401 Unauthorized

**Symptom**: API returns 401 for authenticated routes

**Check**:
1. Token is saved in localStorage
2. Token hasn't expired (24 hour expiry)
3. JWT_SECRET matches between requests

### Issue 4: Backend Not Found

**Symptom**: `ERR_CONNECTION_REFUSED`

**Solutions**:
```cmd
# Check if backend is running
netstat -ano | findstr :8001

# If not running, start it
cd backend
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

---

## 📍 Important URLs

| Service | Local URL | Purpose |
|---------|-----------|---------|
| Frontend | http://localhost:3000 | React UI |
| Backend API | http://localhost:8001 | FastAPI Server |
| API Health | http://localhost:8001/api/health | Health Check |
| API Docs | http://localhost:8001/docs | Swagger UI |
| MySQL | localhost:3306 | Database |

---

## 🔐 Authentication Flow

### 1. User Logs In
```javascript
// POST /api/auth/login
const response = await api.post('/api/auth/login', credentials);
```

### 2. Token Received & Stored
```javascript
localStorage.setItem('token', response.data.access_token);
localStorage.setItem('user', JSON.stringify(response.data.user));
```

### 3. Token Added to All Requests
```javascript
// Automatically done by axios interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 4. Backend Validates Token
```python
# backend/server.py
async def get_current_user(request: Request):
    token = request.headers.get("Authorization").split(" ")[1]
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    user = await execute_query("SELECT * FROM users WHERE id = %s", 
                                (payload['sub'],), fetch_one=True)
    return serialize_row(user)
```

---

## 🎨 Frontend Structure

```
frontend/src/
├── components/          # Reusable components
│   ├── ui/             # Shadcn UI components
│   └── ...
├── context/
│   └── AuthContext.js  # Auth state management
├── lib/
│   └── api.js          # ⭐ Axios instance & config
├── pages/              # Page components
│   ├── LoginPage.js
│   ├── DashboardPage.js
│   ├── PatientsPage.js
│   ├── MeetingsPage.js
│   ├── MeetingWizardPage.js
│   └── MeetingDetailPage.js
├── App.js              # Routes & AuthProvider
└── index.js            # Entry point
```

---

## 🔗 Key Frontend Files

### 1. API Client: `/frontend/src/lib/api.js`
- Axios instance with base URL
- Request interceptor (adds token)
- Response interceptor (handles errors)

### 2. Auth Context: `/frontend/src/context/AuthContext.js`
- User state management
- Login/logout functions
- Token management

### 3. App Router: `/frontend/src/App.js`
- Route definitions
- Protected routes
- Auth provider wrapper

### 4. Environment: `/frontend/.env`
- `REACT_APP_BACKEND_URL` - ⭐ Most important
- Other React app configs

---

## ✅ Verification Checklist

Before starting development, verify:

- [ ] MySQL service is running
- [ ] Database `Hospital_General_Meeting_Scheduler_DB` exists
- [ ] Backend starts without errors on port 8001
- [ ] Backend .env has correct MySQL credentials
- [ ] Frontend .env points to `http://localhost:8001`
- [ ] Frontend starts on port 3000
- [ ] Can access http://localhost:3000 in browser
- [ ] Can access http://localhost:8001/api/health
- [ ] Login page loads correctly
- [ ] Can register/login successfully

---

## 🚀 Daily Development Workflow

### Morning Startup
```cmd
# Terminal 1: Backend
cd backend
venv\Scripts\activate
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8001

# Terminal 2: Frontend
cd frontend
npm start
```

### During Development
- Backend auto-reloads on file changes
- Frontend auto-reloads on file changes
- Check browser console for errors
- Check backend terminal for API errors

### End of Day
- `Ctrl+C` in both terminals to stop servers
- MySQL can keep running or `net stop MySQL80`

---

## 📊 Testing Local Connection

### Quick Test Script

Create `test_connection.cmd`:
```cmd
@echo off
echo Testing Backend Connection...
curl http://localhost:8001/api/health
echo.
echo.
echo Testing Frontend...
curl http://localhost:3000
echo.
echo.
echo Done!
pause
```

Run: `test_connection.cmd`

Expected output:
```json
{"status": "healthy", "database": "MySQL connected"}
<!DOCTYPE html><html lang="en">...
```

---

## 💡 Pro Tips

1. **Keep terminals organized**
   - Terminal 1: Backend (uvicorn logs)
   - Terminal 2: Frontend (React logs)
   - Terminal 3: MySQL client or testing

2. **Use browser DevTools**
   - F12 → Network tab to see API calls
   - Check request/response details
   - Monitor console for errors

3. **Test API independently**
   - Use Postman or curl before testing frontend
   - Verify backend works before debugging frontend

4. **Watch the logs**
   - Backend errors appear in uvicorn terminal
   - Frontend errors in browser console
   - Database errors in both places

---

## 📞 Need Help?

1. **Backend not connecting to MySQL?**
   → Check `LOCAL_SETUP_GUIDE.md` Section "Troubleshooting"

2. **Frontend not calling backend?**
   → Check browser console Network tab
   → Verify `REACT_APP_BACKEND_URL` in frontend/.env

3. **Authentication issues?**
   → Clear browser localStorage
   → Re-register or re-login

4. **Database issues?**
   → Verify DDL script ran successfully
   → Check MySQL logs

---

**Last Updated**: February 21, 2026  
**Version**: 2.0 (MySQL)
