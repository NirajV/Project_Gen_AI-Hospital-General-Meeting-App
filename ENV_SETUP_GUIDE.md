# 🔧 Environment Variables Setup - Detailed Guide

## Problem: Environment Variables Not Working

This guide specifically addresses issues from Step 4 (Environment Variables) in the setup process.

---

## 📍 Location of .env Files

You need TWO separate `.env` files:

1. **Backend `.env`**: `/backend/.env`
2. **Frontend `.env`**: `/frontend/.env`

**They are NOT the same file!**

---

## 🔙 Backend .env File

### Step-by-Step Creation

**1. Open Command Prompt**

**2. Navigate to backend folder:**
```cmd
cd path\to\your\project\backend
```

**3. Check if .env exists:**
```cmd
dir .env
```

**4. Create or edit .env:**
```cmd
notepad .env
```

**5. Paste this content EXACTLY:**

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=12345678
MYSQL_DATABASE=Hospital_General_Meeting_Scheduler_DB
JWT_SECRET=change_this_to_something_random_and_secure
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
UPLOAD_DIR=./uploads
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

**6. CUSTOMIZE THESE VALUES:**

- **MYSQL_PASSWORD**: Change `12345678` to YOUR actual MySQL root password
  - If your password is `admin123`, write: `MYSQL_PASSWORD=admin123`
  - If your password is empty, write: `MYSQL_PASSWORD=`
  - **COMMON MISTAKE**: Adding quotes - DON'T DO THIS: `MYSQL_PASSWORD="12345678"` ❌

- **JWT_SECRET**: Change to any random string (min 20 characters)
  - Good: `JWT_SECRET=hospital_app_super_secret_key_2026_xyz123`
  - Good: `JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
  - Bad: `JWT_SECRET=secret` (too simple)

**7. Save the file:**
- Press `Ctrl + S`
- Close Notepad (Alt + F4)

**8. Verify your .env file:**
```cmd
type .env
```

**✅ Check for these common mistakes:**
- ❌ Extra spaces: `MYSQL_PASSWORD = 12345678` (WRONG)
- ✅ No spaces: `MYSQL_PASSWORD=12345678` (CORRECT)
- ❌ Quotes: `MYSQL_PASSWORD="12345678"` (WRONG)
- ✅ No quotes: `MYSQL_PASSWORD=12345678` (CORRECT)
- ❌ Comments: `# This is my password` at the beginning (WRONG - remove #)
- ✅ Clean: Just the variable and value

---

## ⚛️ Frontend .env File

### Step-by-Step Creation

**1. Open NEW Command Prompt window**

**2. Navigate to frontend folder:**
```cmd
cd path\to\your\project\frontend
```

**3. Check if .env exists:**
```cmd
dir .env
```

**4. Create or edit .env:**
```cmd
notepad .env
```

**5. Paste this content EXACTLY:**

```env
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=3000
ENABLE_HEALTH_CHECK=false
```

**6. IMPORTANT RULES:**

- ✅ **MUST** start with `http://` (NOT https)
- ✅ **MUST** be `localhost:8001` (NOT 127.0.0.1:8001, NOT localhost:8000)
- ✅ **NO** trailing slash: `http://localhost:8001` (NOT `http://localhost:8001/`)
- ✅ **NO** /api at the end: `http://localhost:8001` (NOT `http://localhost:8001/api`)
- ✅ **NO** spaces around `=`
- ✅ **NO** quotes around the URL

**7. Save the file:**
- Press `Ctrl + S`
- Close Notepad

**8. Verify your .env file:**
```cmd
type .env
```

**Common Mistakes:**
- ❌ `REACT_APP_BACKEND_URL=http://localhost:8001/` (trailing slash)
- ❌ `REACT_APP_BACKEND_URL=https://localhost:8001` (https instead of http)
- ❌ `REACT_APP_BACKEND_URL="http://localhost:8001"` (quotes)
- ❌ `REACT_APP_BACKEND_URL=http://localhost:8000` (wrong port)
- ✅ `REACT_APP_BACKEND_URL=http://localhost:8001` (CORRECT)

---

## 🧪 Testing Environment Variables

### Test Backend .env

**1. Navigate to backend:**
```cmd
cd backend
```

**2. Activate virtual environment:**
```cmd
venv\Scripts\activate
```

**3. Test loading environment variables:**

Create a test file:
```cmd
notepad test_env.py
```

Paste this:
```python
import os
from dotenv import load_dotenv

load_dotenv()

print("=== Backend Environment Variables ===")
print(f"MYSQL_HOST: {os.getenv('MYSQL_HOST')}")
print(f"MYSQL_PORT: {os.getenv('MYSQL_PORT')}")
print(f"MYSQL_USER: {os.getenv('MYSQL_USER')}")
print(f"MYSQL_PASSWORD: {os.getenv('MYSQL_PASSWORD')}")
print(f"MYSQL_DATABASE: {os.getenv('MYSQL_DATABASE')}")
print(f"JWT_SECRET: {os.getenv('JWT_SECRET')[:20]}...")
print(f"CORS_ORIGINS: {os.getenv('CORS_ORIGINS')}")
```

Save and run:
```cmd
python test_env.py
```

**✅ Expected Output:**
```
=== Backend Environment Variables ===
MYSQL_HOST: 127.0.0.1
MYSQL_PORT: 3306
MYSQL_USER: root
MYSQL_PASSWORD: 12345678
MYSQL_DATABASE: Hospital_General_Meeting_Scheduler_DB
JWT_SECRET: change_this_to_somet...
CORS_ORIGINS: http://localhost:3000,http://127.0.0.1:3000
```

**❌ If all values are `None`:**
- `.env` file is not in the correct location
- File name is wrong (must be exactly `.env`)
- File has wrong encoding (save as UTF-8)

---

### Test Frontend .env

**1. Open browser to:** http://localhost:3000 (after starting frontend)

**2. Open DevTools (F12)**

**3. Go to Console tab**

**4. Type:**
```javascript
console.log(process.env.REACT_APP_BACKEND_URL)
```

**✅ Expected Output:**
```
http://localhost:8001
```

**❌ If you see `undefined`:**
- `.env` file is not in frontend folder
- Variable name is wrong (must start with `REACT_APP_`)
- You need to restart frontend server for changes to take effect

**To restart frontend:**
- Press `Ctrl + C` in frontend terminal
- Run `npm start` again

---

## 🔍 Common .env Issues

### Issue 1: "Cannot connect to MySQL"

**Symptoms:**
- Backend logs show: `Can't connect to MySQL server`
- Health check returns unhealthy

**Solutions:**

**A. Wrong Password**
```cmd
# Test MySQL connection manually
mysql -u root -p
```
Enter your password. If it fails, that's your actual password.

Update `.env`:
```env
MYSQL_PASSWORD=your_actual_password_here
```

**B. MySQL Not Running**
```cmd
net start MySQL80
```

**C. Wrong Host/Port**

Check MySQL is on 3306:
```cmd
netstat -ano | findstr :3306
```

If MySQL is on different port, update:
```env
MYSQL_PORT=3307
```

---

### Issue 2: Frontend Can't Reach Backend

**Symptoms:**
- Network error in browser
- "ERR_CONNECTION_REFUSED"

**Solutions:**

**A. Backend Not Running**

In backend terminal, you should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8001
INFO:     Application startup complete.
```

If not, start it:
```cmd
cd backend
venv\Scripts\activate
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

**B. Wrong Backend URL**

Check frontend `.env`:
```cmd
cd frontend
type .env
```

Must be:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

**C. Restart Frontend**

After changing `.env`, you MUST restart:
```cmd
# Press Ctrl+C in frontend terminal
npm start
```

---

### Issue 3: CORS Errors

**Symptoms:**
- Browser console: "blocked by CORS policy"
- Backend receives request but browser blocks response

**Solution:**

Check backend `.env`:
```cmd
cd backend
type .env
```

Must include:
```env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

**Important:**
- No spaces after comma
- Both localhost and 127.0.0.1 versions
- Must match the URL you're using in browser

Restart backend after changing.

---

### Issue 4: Environment Variables Not Loading

**Cause:** Wrong file location or name

**Solution:**

**1. Verify file locations:**
```cmd
# Check backend
cd backend
dir .env

# Check frontend  
cd frontend
dir .env
```

Both should show `.env` file.

**2. Check file name exactly:**
- ✅ Must be: `.env`
- ❌ NOT: `env` (missing dot)
- ❌ NOT: `.env.txt` (wrong extension)
- ❌ NOT: `env.txt`

**3. Show hidden files in Windows:**
- Open folder in File Explorer
- Click `View` tab
- Check `File name extensions`
- Check `Hidden items`

**4. Create .env using command line to avoid issues:**

Backend:
```cmd
cd backend
echo MYSQL_HOST=127.0.0.1 > .env
echo MYSQL_PORT=3306 >> .env
echo MYSQL_USER=root >> .env
echo MYSQL_PASSWORD=12345678 >> .env
echo MYSQL_DATABASE=Hospital_General_Meeting_Scheduler_DB >> .env
echo JWT_SECRET=change_this_secret >> .env
echo JWT_ALGORITHM=HS256 >> .env
echo JWT_EXPIRATION_HOURS=24 >> .env
echo UPLOAD_DIR=./uploads >> .env
echo CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000 >> .env
```

Frontend:
```cmd
cd frontend
echo REACT_APP_BACKEND_URL=http://localhost:8001 > .env
echo WDS_SOCKET_PORT=3000 >> .env
echo ENABLE_HEALTH_CHECK=false >> .env
```

---

## ✅ Final Verification

### Backend .env Check:

```cmd
cd backend
type .env
```

Should output:
```
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=Hospital_General_Meeting_Scheduler_DB
JWT_SECRET=your_secret
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
UPLOAD_DIR=./uploads
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Frontend .env Check:

```cmd
cd frontend
type .env
```

Should output:
```
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=3000
ENABLE_HEALTH_CHECK=false
```

### Test Everything:

**1. Start Backend:**
```cmd
cd backend
venv\Scripts\activate
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

**2. Test Health (New terminal):**
```cmd
curl http://localhost:8001/api/health
```

Should return:
```json
{"status":"healthy","database":"connected"}
```

**3. Start Frontend (New terminal):**
```cmd
cd frontend
npm start
```

**4. Open browser:** http://localhost:3000

Should see the login page!

---

## 📝 Quick Reference

### Backend .env Template
```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=YOUR_MYSQL_ROOT_PASSWORD
MYSQL_DATABASE=Hospital_General_Meeting_Scheduler_DB
JWT_SECRET=CHANGE_THIS_TO_RANDOM_STRING
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
UPLOAD_DIR=./uploads
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Frontend .env Template
```env
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=3000
ENABLE_HEALTH_CHECK=false
```

---

**If you're still having issues after following this guide, double-check:**
1. ✅ File names are exactly `.env`
2. ✅ Files are in correct folders (backend/.env and frontend/.env)
3. ✅ No extra spaces or quotes in values
4. ✅ MySQL password is correct
5. ✅ MySQL is running on port 3306
6. ✅ Both backend and frontend are restarted after changing .env

---

**Last Updated**: February 22, 2026
