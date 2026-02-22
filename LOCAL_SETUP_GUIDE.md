# 🏥 Hospital Meeting App - Complete Local Setup Guide (Windows)

## 📋 Prerequisites Checklist

Before starting, ensure you have ALL of these installed:

- [ ] **Python 3.8 or higher** - [Download](https://www.python.org/downloads/)
  - During installation, CHECK "Add Python to PATH"
- [ ] **Node.js 16 or higher** - [Download](https://nodejs.org/)
- [ ] **MySQL Server 8.0** - [Download](https://dev.mysql.com/downloads/mysql/)
- [ ] **Git** (optional) - [Download](https://git-scm.com/downloads)
- [ ] **Code Editor** (VS Code recommended) - [Download](https://code.visualstudio.com/)

### ✅ Verify Installations

Open Command Prompt (cmd) and run these commands:

```cmd
python --version
```
Expected: `Python 3.8.x` or higher

```cmd
node --version
```
Expected: `v16.x.x` or higher

```cmd
npm --version
```
Expected: `8.x.x` or higher

```cmd
mysql --version
```
Expected: `mysql  Ver 8.0.x`

If any command fails, install/reinstall that tool and make sure it's added to PATH.

---

## 🗄️ PART 1: MySQL Database Setup

### Step 1.1: Start MySQL Service

**Option A: Using Windows Services**
1. Press `Win + R`
2. Type `services.msc` and press Enter
3. Find `MySQL80` in the list
4. Right-click → Start (if not already running)
5. Right-click → Properties → Set Startup type to "Automatic"

**Option B: Using Command Prompt (as Administrator)**
```cmd
net start MySQL80
```

**Verify MySQL is Running:**
```cmd
mysql -u root -p
```
- Enter your MySQL root password when prompted
- If you see `mysql>` prompt, MySQL is running ✅
- Type `exit` to quit

---

### Step 1.2: Create Database and User

**Method A: Using MySQL Workbench (Recommended for Beginners)**

1. Open **MySQL Workbench**
2. Click on your local connection (usually `localhost:3306`)
3. Enter your root password
4. In the query editor, paste this:

```sql
-- Create the database
CREATE DATABASE IF NOT EXISTS Hospital_General_Meeting_Scheduler_DB;

-- Use the database
USE Hospital_General_Meeting_Scheduler_DB;

-- Verify database is created
SHOW DATABASES;
```

5. Click the ⚡ (Execute) button
6. You should see the database in the list

**Method B: Using Command Line**

```cmd
mysql -u root -p
```

Then paste these SQL commands:

```sql
CREATE DATABASE IF NOT EXISTS Hospital_General_Meeting_Scheduler_DB;
USE Hospital_General_Meeting_Scheduler_DB;
SHOW DATABASES;
exit
```

**✅ Verification:**
You should see `Hospital_General_Meeting_Scheduler_DB` in the database list.

---

### Step 1.3: Run Database Schema (DDL)

**IMPORTANT:** Navigate to your project folder first!

```cmd
cd path\to\your\project
cd database
```

**Run the DDL script:**

```cmd
mysql -u root -p Hospital_General_Meeting_Scheduler_DB < ddl.sql
```

Enter your MySQL password when prompted.

**✅ Verification:**

```cmd
mysql -u root -p Hospital_General_Meeting_Scheduler_DB
```

Then:

```sql
SHOW TABLES;
```

You should see these tables:
- `users`
- `patients`
- `meetings`
- `meeting_participants`
- `meeting_patients`
- `agenda_items`
- `decision_logs`
- `file_attachments`
- `user_sessions`

Type `exit` to quit MySQL.

---

## 🔧 PART 2: Backend Setup

### Step 2.1: Navigate to Backend Folder

```cmd
cd path\to\your\project\backend
```

Example:
```cmd
cd C:\Users\YourName\hospital-meeting-app\backend
```

---

### Step 2.2: Create Virtual Environment (Highly Recommended)

**Why?** Isolates project dependencies from your system Python.

```cmd
python -m venv venv
```

This creates a `venv` folder in your backend directory.

**Activate the Virtual Environment:**

```cmd
venv\Scripts\activate
```

**✅ You should see `(venv)` at the start of your command prompt:**
```
(venv) C:\...\backend>
```

---

### Step 2.3: Install Python Dependencies

**IMPORTANT:** Make sure virtual environment is activated!

```cmd
pip install -r requirements.txt
```

This will take 1-2 minutes. You should see installation progress for each package.

**✅ Verification:**

```cmd
pip list
```

You should see packages like:
- fastapi
- uvicorn
- pymongo
- motor
- bcrypt
- python-jose
- etc.

**If you get an error about missing packages**, install them individually:

```cmd
pip install fastapi uvicorn motor bcrypt python-jose python-multipart aiofiles
```

---

### Step 2.4: Configure Backend Environment Variables

**⚠️ THIS IS WHERE MOST ISSUES HAPPEN - FOLLOW CAREFULLY**

Navigate to the backend folder (if not already there):

```cmd
cd backend
```

**Check if `.env` file exists:**

```cmd
dir .env
```

**Option A: If `.env` file exists - EDIT IT**

Open `.env` file in Notepad or VS Code:

```cmd
notepad .env
```

**Option B: If `.env` file DOESN'T exist - CREATE IT**

```cmd
notepad .env
```

Click "Yes" when asked to create a new file.

**✏️ COPY AND PASTE THIS EXACTLY into your `.env` file:**

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=YOUR_MYSQL_PASSWORD_HERE
MYSQL_DATABASE=Hospital_General_Meeting_Scheduler_DB
JWT_SECRET=your_secret_key_change_this_in_production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
UPLOAD_DIR=./uploads
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

**🔑 IMPORTANT CHANGES:**

1. **Replace `YOUR_MYSQL_PASSWORD_HERE`** with your actual MySQL root password
   - If your password is `12345678`, write: `MYSQL_PASSWORD=12345678`
   - **NO SPACES** around the `=` sign
   - **NO QUOTES** unless your password contains quotes

2. **Change `JWT_SECRET`** to any random string:
   - Example: `JWT_SECRET=my_super_secret_key_2026_hospital_app`
   - Or generate random: `JWT_SECRET=a8f9d2c4e6b3a1f7d9e2c5b8a4f6d3e1`

**Save and close the file (Ctrl+S, then Alt+F4)**

**✅ Verification - View your .env file:**

```cmd
type .env
```

Make sure:
- ✅ No extra spaces
- ✅ Your actual MySQL password is there
- ✅ All required variables are present
- ✅ No typos in variable names

---

### Step 2.5: Create Uploads Folder

```cmd
mkdir uploads
```

If folder already exists, you'll see an error - that's okay!

---

### Step 2.6: Start Backend Server

**IMPORTANT:** Make sure you're in the backend folder with venv activated!

```cmd
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

**✅ You should see:**

```
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
INFO:     Started reloader process [XXXX] using WatchFiles
INFO:     Started server process [XXXX]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**❌ If you see errors:**

**Error 1: "No module named 'fastapi'"**
```cmd
pip install fastapi uvicorn
```

**Error 2: "Can't connect to MySQL server"**
- Check MySQL is running: `net start MySQL80`
- Check your password in `.env` is correct
- Test connection: `mysql -u root -p`

**Error 3: "uvicorn: command not found"**
```cmd
python -m pip install uvicorn
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

**Error 4: "Address already in use"**

Port 8001 is already being used. Kill the process:

```cmd
netstat -ano | findstr :8001
taskkill /PID <PID_NUMBER> /F
```

Replace `<PID_NUMBER>` with the number from the previous command.

---

### Step 2.7: Test Backend (Keep Backend Running)

**Open a NEW Command Prompt window** (don't close the backend window!)

```cmd
curl http://localhost:8001/docs
```

Or open your browser and go to:
```
http://localhost:8001/docs
```

**✅ You should see the FastAPI Swagger documentation page.**

**Test Health Endpoint:**

```cmd
curl http://localhost:8001/api/health
```

**✅ Expected response:**
```json
{"status":"healthy","database":"connected"}
```

**❌ If you get an error:**
- Make sure backend is still running in the other window
- Check if you can access http://localhost:8001 in your browser
- Review backend terminal for error messages

---

## ⚛️ PART 3: Frontend Setup

**IMPORTANT:** Keep the backend running! Open a NEW Command Prompt window.

### Step 3.1: Navigate to Frontend Folder

```cmd
cd path\to\your\project\frontend
```

Example:
```cmd
cd C:\Users\YourName\hospital-meeting-app\frontend
```

---

### Step 3.2: Install Node Dependencies

**This will take 2-5 minutes**

```cmd
npm install
```

**❌ If you get errors, try:**

```cmd
npm install --legacy-peer-deps
```

**✅ Verification:**

```cmd
dir node_modules
```

You should see a `node_modules` folder with many packages.

---

### Step 3.3: Configure Frontend Environment Variables

**⚠️ CRITICAL STEP - MUST BE CORRECT**

Check if `.env` file exists:

```cmd
dir .env
```

**Create or Edit `.env` file:**

```cmd
notepad .env
```

**✏️ PASTE THIS EXACTLY:**

```env
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=3000
ENABLE_HEALTH_CHECK=false
```

**🔑 IMPORTANT:**
- The backend URL **MUST** be `http://localhost:8001` (NOT https, NOT with /api)
- **NO TRAILING SLASH** at the end
- **NO SPACES** around `=`

**Save and close (Ctrl+S, then Alt+F4)**

**✅ Verification:**

```cmd
type .env
```

Make sure it matches exactly:
```
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=3000
ENABLE_HEALTH_CHECK=false
```

---

### Step 3.4: Start Frontend Development Server

```cmd
npm start
```

**This will take 1-2 minutes to compile...**

**✅ You should see:**

```
Compiled successfully!

You can now view hospital-meeting-app in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

**Your browser should automatically open to http://localhost:3000**

If it doesn't, manually open:
```
http://localhost:3000
```

**❌ If you see errors:**

**Error 1: "Port 3000 is already in use"**

Kill the process:
```cmd
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

Then run `npm start` again.

**Error 2: "Module not found"**

```cmd
npm install
npm start
```

**Error 3: Blank white screen**

1. Open browser DevTools (F12)
2. Check Console for errors
3. Verify backend is running: http://localhost:8001/api/health
4. Check `.env` file has correct backend URL

---

## 🧪 PART 4: Testing the Application

### Step 4.1: Access the Application

Open browser: **http://localhost:3000**

You should see the **Login Page** with:
- "MedMeet" logo
- Hospital Case Meeting Scheduler
- Email and Password fields
- "Sign in with Google" button
- "Register" link

---

### Step 4.2: Create a Test User

**Option A: Using the UI**

1. Click **"Register"** or **"Don't have an account? Sign up"**
2. Fill in:
   - **Email**: `testdoctor@hospital.com`
   - **Name**: `Dr. Test Doctor`
   - **Password**: `password123`
   - **Specialty**: `General Medicine`
3. Click **Register**
4. You should be logged in and see the Dashboard

**Option B: Using API (with curl)**

Open a new Command Prompt:

```cmd
curl -X POST http://localhost:8001/api/auth/register -H "Content-Type: application/json" -d "{\"email\":\"testdoctor@hospital.com\",\"name\":\"Dr. Test Doctor\",\"password\":\"password123\",\"specialty\":\"General Medicine\",\"role\":\"organizer\"}"
```

**✅ Expected Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": {...}
}
```

---

### Step 4.3: Login

1. Go to: http://localhost:3000
2. Enter:
   - **Email**: `testdoctor@hospital.com`
   - **Password**: `password123`
3. Click **Sign In**

**✅ You should see the Dashboard with:**
- Welcome message
- 4 stat cards (Upcoming Meetings, This Week, Pending Invites, Total Patients)
- "New Meeting" button
- Navigation menu

---

### Step 4.4: Test Core Features

**1. Create a Patient:**
   - Click **Patients** in navigation
   - Click **"Add Patient"**
   - Fill in patient details
   - Click **Save**
   - ✅ Patient should appear in list

**2. Create a Meeting:**
   - Click **Dashboard** or **Meetings**
   - Click **"New Meeting"**
   - Follow 4-step wizard:
     - Step 1: Meeting info (title, date, time)
     - Step 2: Participants (select doctors)
     - Step 3: Patients (select patients)
     - Step 4: Agenda (add agenda items)
   - Click **Create Meeting**
   - ✅ Meeting should be created

**3. View Meeting Details:**
   - Click on a meeting from the list
   - You should see tabs: Overview, Patients, Agenda, Files, Decisions
   - ✅ All tabs should load correctly

---

### Step 4.5: Verify Database

Open MySQL:

```cmd
mysql -u root -p Hospital_General_Meeting_Scheduler_DB
```

Check data:

```sql
-- View users
SELECT id, email, name, role FROM users;

-- View patients
SELECT id, first_name, last_name, primary_diagnosis FROM patients;

-- View meetings
SELECT id, title, meeting_date, status FROM meetings;

-- Exit
exit
```

---

## 🚨 Common Issues & Solutions

### Issue 1: Backend won't start - "Can't connect to MySQL"

**Solution:**

1. **Check MySQL is running:**
   ```cmd
   net start MySQL80
   ```

2. **Test MySQL connection:**
   ```cmd
   mysql -u root -p
   ```
   If this fails, your password is wrong or MySQL is not installed correctly.

3. **Verify `.env` file:**
   ```cmd
   cd backend
   type .env
   ```
   Make sure `MYSQL_PASSWORD` matches your actual password.

4. **Check MySQL is on port 3306:**
   ```cmd
   netstat -ano | findstr :3306
   ```
   You should see a line with `3306`.

---

### Issue 2: Frontend can't connect to Backend

**Symptoms:** Network errors in browser console

**Solution:**

1. **Verify backend is running:**
   - Check the backend terminal window
   - Should show "Application startup complete"

2. **Test backend manually:**
   ```cmd
   curl http://localhost:8001/api/health
   ```

3. **Check frontend `.env`:**
   ```cmd
   cd frontend
   type .env
   ```
   Should have: `REACT_APP_BACKEND_URL=http://localhost:8001`

4. **Clear browser cache:**
   - Press Ctrl+Shift+Delete
   - Clear cached images and files
   - Refresh page (Ctrl+F5)

5. **Restart frontend:**
   - Stop frontend (Ctrl+C in frontend terminal)
   - Run `npm start` again

---

### Issue 3: "uvicorn: command not found" (Windows)

**Solution:**

```cmd
python -m pip install uvicorn
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

---

### Issue 4: Module Not Found Errors

**Backend:**
```cmd
cd backend
venv\Scripts\activate
pip install -r requirements.txt
```

**Frontend:**
```cmd
cd frontend
npm install
```

---

### Issue 5: Port Already in Use

**Backend (port 8001):**
```cmd
netstat -ano | findstr :8001
taskkill /PID <PID> /F
```

**Frontend (port 3000):**
```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

### Issue 6: Blank Page or White Screen

1. **Open Browser DevTools (F12)**
2. Check **Console** tab for errors
3. Check **Network** tab - are API calls reaching backend?

**Common fixes:**
- Make sure backend is running
- Check `.env` has correct backend URL
- Clear browser cache and cookies
- Try incognito/private window

---

## 📁 Final Folder Structure

```
your-project/
├── backend/
│   ├── venv/              # Virtual environment
│   ├── uploads/           # File uploads folder
│   ├── .env              # Backend config ✅
│   ├── server.py         # Main backend file
│   └── requirements.txt  # Python dependencies
├── frontend/
│   ├── node_modules/     # Node packages
│   ├── src/              # React source code
│   ├── .env              # Frontend config ✅
│   └── package.json      # Node dependencies
└── database/
    └── ddl.sql           # Database schema
```

---

## ✅ Verification Checklist

Before considering setup complete, verify:

- [ ] MySQL service is running
- [ ] Database `Hospital_General_Meeting_Scheduler_DB` exists
- [ ] All 9 tables are created (users, patients, meetings, etc.)
- [ ] Backend `.env` file configured correctly
- [ ] Backend starts without errors on port 8001
- [ ] http://localhost:8001/api/health returns healthy status
- [ ] Frontend `.env` file configured correctly
- [ ] Frontend starts without errors on port 3000
- [ ] http://localhost:3000 loads the login page
- [ ] Can register a new user
- [ ] Can login successfully
- [ ] Can see dashboard after login
- [ ] Can create a patient
- [ ] Can create a meeting
- [ ] Data appears in MySQL database

---

## 🎯 Quick Start Commands (After Initial Setup)

**Every time you want to run the app:**

**1. Start MySQL** (if not running):
```cmd
net start MySQL80
```

**2. Start Backend** (Terminal 1):
```cmd
cd path\to\project\backend
venv\Scripts\activate
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

**3. Start Frontend** (Terminal 2):
```cmd
cd path\to\project\frontend
npm start
```

**4. Open Browser:**
```
http://localhost:3000
```

---

## 💡 Pro Tips

1. **Keep terminals organized:**
   - Terminal 1: Backend (shows API requests)
   - Terminal 2: Frontend (shows React compilation)
   - Terminal 3: MySQL or testing

2. **Bookmark these URLs:**
   - Frontend: http://localhost:3000
   - Backend API Docs: http://localhost:8001/docs
   - Health Check: http://localhost:8001/api/health

3. **Use VS Code integrated terminal:**
   - Open project in VS Code
   - Use split terminal (Ctrl+Shift+`)
   - Run backend and frontend side-by-side

4. **Create batch files for quick start:**

Create `start-backend.bat`:
```batch
@echo off
cd backend
call venv\Scripts\activate
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8001
pause
```

Create `start-frontend.bat`:
```batch
@echo off
cd frontend
npm start
pause
```

---

## 📞 Still Having Issues?

1. **Check the logs:**
   - Backend: Look at terminal output
   - Frontend: Browser DevTools (F12) → Console
   - MySQL: Run queries to check data

2. **Common commands for debugging:**
   ```cmd
   # Check what's running on a port
   netstat -ano | findstr :8001
   
   # Test backend health
   curl http://localhost:8001/api/health
   
   # Check MySQL tables
   mysql -u root -p -e "USE Hospital_General_Meeting_Scheduler_DB; SHOW TABLES;"
   ```

3. **Review documentation:**
   - [QUICK_START.md](QUICK_START.md) - Quick reference
   - [MONGODB_SCHEMA.md](MONGODB_SCHEMA.md) - Database structure
   - [CONNECTION_GUIDE.md](CONNECTION_GUIDE.md) - How components connect

---

**Last Updated**: February 22, 2026  
**Version**: 3.0 (Enhanced for Local MySQL Setup)  
**Tested On**: Windows 10/11, Python 3.10, Node.js 18, MySQL 8.0

---

🎉 **Congratulations! Your Hospital Meeting App should now be running locally!** 🎉
