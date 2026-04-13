# 🔧 Backend .env Configuration Fix

**Issue:** Backend container failing to start  
**Root Cause:** Incorrect MongoDB URL in `/app/backend/.env`

---

## ❌ The Problem

The backend `.env` file was pointing to:
```
MONGO_URL=mongodb://localhost:27017/hospital_meeting_db
```

**This doesn't work in Docker because:**
- `localhost` inside the backend container refers to the container itself
- MongoDB is running in a separate container named `mongodb`
- Need to use the Docker service name and credentials

---

## ✅ The Fix

**Updated `/app/backend/.env` with:**
```
MONGO_URL=mongodb://admin:changeme123@mongodb:27017
DB_NAME=hospital_meeting_scheduler
```

**Key changes:**
- `localhost` → `mongodb` (Docker service name)
- Added credentials: `admin:changeme123` (from docker-compose)
- Database name: `hospital_meeting_scheduler`

---

## 📋 Complete Correct Backend .env

**File: `/app/backend/.env`**

```bash
# MongoDB Configuration (Docker service name)
MONGO_URL=mongodb://admin:changeme123@mongodb:27017
DB_NAME=hospital_meeting_scheduler

# JWT Configuration
JWT_SECRET=hospital_meeting_scheduler_secret_key_2025
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# File Upload
UPLOAD_DIR=/app/uploads

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://hospital-case-room.preview.emergentagent.com

# Email Configuration (Optional)
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=niraj.k.vishwakarma@gmail.com
SMTP_PASSWORD=ynqv ocdz zauh iirc
SMTP_FROM=niraj.k.vishwakarma@gmail.com
SMTP_USE_TLS=true

# Owner Email
OWNER_EMAIL=Niraj.K.Vishwakarma@gmail.com
```

---

## 🔄 Apply the Fix

**The .env file in Emergent is already fixed. Now rebuild and restart:**

```bash
cd ~/hospital-meeting-app/Project_Gen_AI-Hospital-General-Meeting-App

# Stop containers
sudo docker compose -f docker-compose.mongodb.yml down

# Rebuild backend (picks up new .env)
sudo docker compose -f docker-compose.mongodb.yml build backend

# Start all services
sudo docker compose -f docker-compose.mongodb.yml up -d

# Wait 30 seconds, then check
sleep 30
sudo docker ps
```

---

## 🔍 Verify Backend is Running

**Check container status:**
```bash
sudo docker ps
```

**Expected:** `hospital_backend` should show "Up (healthy)"

**Check backend logs:**
```bash
sudo docker logs hospital_backend
```

**Expected to see:**
```
INFO:     Uvicorn running on http://0.0.0.0:8001
INFO:     Application startup complete
```

---

## 🧪 Test Backend API

```bash
# Get your server IP from .env or:
SERVER_IP=$(ip addr show | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}' | cut -d'/' -f1)

# Test health endpoint
curl http://$SERVER_IP:3000/api/health

# Expected response:
# {"status":"healthy"}
```

---

## 🎯 Key Environment Variables Explained

| Variable | What It Does | Docker Value |
|----------|-------------|--------------|
| `MONGO_URL` | MongoDB connection string | `mongodb://admin:changeme123@mongodb:27017` |
| `DB_NAME` | Database name | `hospital_meeting_scheduler` |
| `JWT_SECRET` | Token signing secret | Any 32+ char string |
| `UPLOAD_DIR` | File upload location | `/app/uploads` |
| `CORS_ORIGINS` | Allowed frontend URLs | Your server URLs |

---

## ⚠️ Important Notes

### 1. MongoDB Credentials Match
The `MONGO_URL` credentials must match `docker-compose.mongodb.yml`:
```yaml
environment:
  MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USER:-admin}
  MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD:-changeme123}
```

### 2. Docker Service Names
Inside Docker, use service names from `docker-compose.mongodb.yml`:
- ✅ `mongodb:27017` (correct)
- ❌ `localhost:27017` (wrong)

### 3. Frontend URL
The backend needs to know where the frontend is for email links.

---

## 🔧 If Still Failing

### Check Backend Logs in Detail
```bash
sudo docker logs hospital_backend --tail 100
```

### Common Errors & Fixes

**Error: "Connection refused to mongodb:27017"**
```bash
# MongoDB not ready yet, wait longer
sleep 60
sudo docker ps
```

**Error: "Authentication failed"**
```bash
# Credentials don't match docker-compose
# Update docker-compose or backend .env to match
```

**Error: "Module not found"**
```bash
# Rebuild with clean cache
sudo docker compose -f docker-compose.mongodb.yml build --no-cache backend
```

---

## ✅ Success Indicators

After fix, you should see:

```bash
$ sudo docker ps

CONTAINER ID   IMAGE              STATUS
xxxxx          hospital_mongodb   Up (healthy)
xxxxx          hospital_backend   Up (healthy)  ← This should now work!
xxxxx          hospital_frontend  Up (healthy)
```

---

## 📝 Summary

**Problem:** Backend `.env` had `localhost` instead of Docker service name  
**Solution:** Changed to `mongodb://admin:changeme123@mongodb:27017`  
**Action:** Rebuild backend and restart services

---

**Run the commands above and let me know if backend starts successfully!**
