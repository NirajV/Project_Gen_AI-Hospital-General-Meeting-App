# 🎯 CONNECTION GUIDE: Frontend → Backend → MySQL

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        YOUR LOCAL MACHINE                            │
│                                                                      │
│  ┌───────────────────┐         ┌──────────────────┐                │
│  │   Web Browser     │         │  MySQL Server    │                │
│  │  localhost:3000   │         │  localhost:3306  │                │
│  │                   │         │                  │                │
│  │  React Frontend   │         │  Database:       │                │
│  │  (HTML/CSS/JS)    │         │  Hospital_...DB  │                │
│  └─────────┬─────────┘         └────────┬─────────┘                │
│            │                             │                          │
│            │ HTTP API Calls              │                          │
│            │ (Axios)                     │ SQL Queries              │
│            ▼                             │ (aiomysql)               │
│  ┌─────────────────────────────────────┐│                          │
│  │     FastAPI Backend Server          ││                          │
│  │     localhost:8001                  ││                          │
│  │                                     ││                          │
│  │  ┌──────────────────────────────┐  ││                          │
│  │  │  API Routes                  │  ││                          │
│  │  │  /api/auth/login            │  ││                          │
│  │  │  /api/patients              │  ││                          │
│  │  │  /api/meetings              │◄─┼┘                          │
│  │  │  /api/dashboard/stats       │  │                           │
│  │  └──────────────────────────────┘  │                           │
│  │                                     │                           │
│  │  ┌──────────────────────────────┐  │                           │
│  │  │  Business Logic              │  │                           │
│  │  │  - Authentication            │  │                           │
│  │  │  - Data Validation           │  │                           │
│  │  │  - File Handling             │  │                           │
│  │  └──────────────────────────────┘  │                           │
│  └─────────────────────────────────────┘                           │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Data Flow: User Action → Database

### Example: Creating a Meeting

```
1. USER ACTION (Browser)
   ↓
   User fills "New Meeting" form and clicks "Create"
   
2. FRONTEND (React - localhost:3000)
   ↓
   File: /frontend/src/pages/MeetingWizardPage.js
   Code:
   ```javascript
   const response = await api.post('/api/meetings', {
     title: 'Cardiology Review',
     meeting_date: '2026-03-01',
     start_time: '10:00:00',
     participant_ids: ['user-id-1']
   });
   ```
   ↓
   Axios (from /frontend/src/lib/api.js) makes HTTP POST request
   
3. HTTP REQUEST
   ↓
   POST http://localhost:8001/api/meetings
   Headers: 
     - Content-Type: application/json
     - Authorization: Bearer eyJhbGc...
   Body: { meeting data... }
   
4. BACKEND (FastAPI - localhost:8001)
   ↓
   File: /backend/server.py
   Route: @api_router.post("/meetings")
   Code:
   ```python
   @api_router.post("/meetings")
   async def create_meeting(meeting: MeetingCreate, 
                           current_user: dict = Depends(get_current_user)):
       meeting_id = str(uuid.uuid4())
       await execute_query(
           """INSERT INTO meetings (id, title, meeting_date, start_time, organizer_id)
              VALUES (%s, %s, %s, %s, %s)""",
           (meeting_id, meeting.title, meeting.meeting_date, 
            meeting.start_time, current_user['id'])
       )
   ```
   ↓
   Calls execute_query() helper function
   
5. DATABASE CONNECTION (aiomysql)
   ↓
   execute_query() gets connection from pool:
   ```python
   async def execute_query(query: str, params: tuple):
       db_pool = await get_db_pool()  # MySQL connection pool
       async with db_pool.acquire() as conn:
           async with conn.cursor() as cur:
               await cur.execute(query, params)
   ```
   ↓
   Sends SQL query to MySQL
   
6. MYSQL DATABASE (localhost:3306)
   ↓
   Database: Hospital_General_Meeting_Scheduler_DB
   Table: meetings
   Action: INSERT new row
   ↓
   Returns: meeting_id (lastrowid)
   
7. RESPONSE PATH (Reverse Order)
   ↓
   MySQL → Backend → HTTP Response → Frontend → Browser
   ↓
   Frontend receives: { id: 'uuid', message: 'Meeting created' }
   ↓
   UI updates: Redirects to meeting detail page
```

---

## 🔐 Authentication Flow

### Login Process

```
1. USER ENTERS CREDENTIALS
   Email: doctor@hospital.com
   Password: password123
   ↓
   
2. FRONTEND SENDS REQUEST
   POST http://localhost:8001/api/auth/login
   Body: { email: '...', password: '...' }
   ↓
   
3. BACKEND VALIDATES
   a) Query MySQL: SELECT * FROM users WHERE email = 'doctor@hospital.com'
   b) Compare password hash using bcrypt
   c) Generate JWT token with user ID and email
   ↓
   
4. MYSQL RETURNS USER
   { id: 'user-uuid', email: '...', password_hash: '$2b$12...' }
   ↓
   
5. BACKEND RESPONDS
   { 
     access_token: 'eyJhbGc...',
     token_type: 'bearer',
     user: { id: '...', email: '...', name: '...' }
   }
   ↓
   
6. FRONTEND STORES TOKEN
   localStorage.setItem('token', token)
   localStorage.setItem('user', JSON.stringify(user))
   ↓
   
7. ALL FUTURE REQUESTS INCLUDE TOKEN
   Headers: Authorization: Bearer eyJhbGc...
   ↓
   Backend verifies token before processing each request
```

---

## 📡 API Request Anatomy

### Example: Get All Patients

```javascript
// FRONTEND CODE (React)
const fetchPatients = async () => {
  try {
    const response = await api.get('/api/patients');
    setPatients(response.data);
  } catch (error) {
    console.error('Failed to fetch patients:', error);
  }
};
```

**What happens behind the scenes:**

```
1. api.get('/api/patients')
   ↓
   Axios interceptor adds token (from lib/api.js)
   ↓
   
2. HTTP GET REQUEST
   URL: http://localhost:8001/api/patients
   Headers:
     - Authorization: Bearer eyJhbGc...
     - Content-Type: application/json
   ↓
   
3. BACKEND RECEIVES REQUEST
   @api_router.get("/patients")
   ↓
   Calls: current_user = Depends(get_current_user)
   ↓
   get_current_user() function:
     - Extracts token from Authorization header
     - Decodes JWT to get user_id
     - Queries MySQL: SELECT * FROM users WHERE id = user_id
     - Returns user object or raises 401 Unauthorized
   ↓
   
4. QUERY PATIENTS
   await execute_query(
     "SELECT * FROM patients WHERE is_active = TRUE",
     fetch_all=True
   )
   ↓
   
5. MYSQL RETURNS DATA
   [
     { id: 'p1', first_name: 'John', last_name: 'Doe', ... },
     { id: 'p2', first_name: 'Jane', last_name: 'Smith', ... }
   ]
   ↓
   
6. BACKEND SERIALIZES & RESPONDS
   Converts datetime objects to ISO strings
   Returns: 200 OK with JSON array
   ↓
   
7. FRONTEND RECEIVES DATA
   response.data = [patient objects...]
   ↓
   React updates state: setPatients(response.data)
   ↓
   UI re-renders with patient list
```

---

## 🔧 Configuration Points

### 1. Frontend Knows Backend Location

**File**: `/app/frontend/.env`
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

**Used in**: `/app/frontend/src/lib/api.js`
```javascript
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({ baseURL: API_BASE_URL });
```

**Result**: All API calls go to `http://localhost:8001/api/*`

---

### 2. Backend Knows Database Location

**File**: `/app/backend/.env`
```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=12345678
MYSQL_DATABASE=Hospital_General_Meeting_Scheduler_DB
```

**Used in**: `/app/backend/server.py`
```python
MYSQL_CONFIG = {
    'host': os.environ.get('MYSQL_HOST'),
    'port': int(os.environ.get('MYSQL_PORT')),
    'user': os.environ.get('MYSQL_USER'),
    'password': os.environ.get('MYSQL_PASSWORD'),
    'db': os.environ.get('MYSQL_DATABASE'),
}

pool = await aiomysql.create_pool(**MYSQL_CONFIG)
```

**Result**: Backend connects to MySQL at `127.0.0.1:3306`

---

### 3. Backend Allows Frontend CORS

**File**: `/app/backend/.env`
```env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

**Used in**: `/app/backend/server.py`
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Result**: Browser can make requests from localhost:3000 to localhost:8001

---

## 🧪 Testing the Connection

### Test 1: MySQL is Running
```cmd
mysql -u root -p -h 127.0.0.1
# Should connect successfully
```

### Test 2: Backend Can Connect to MySQL
```cmd
# Start backend
cd backend
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8001

# In another terminal, test health
curl http://localhost:8001/api/health
```
Expected: `{"status": "healthy", "database": "MySQL connected"}`

### Test 3: Frontend Can Call Backend
```cmd
# Start frontend
cd frontend
npm start

# Open browser console (F12)
# Try to login or register
# Check Network tab for API calls to http://localhost:8001
```

### Test 4: End-to-End Test
```cmd
# 1. Register user via curl
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@test.com\",\"name\":\"Test User\",\"password\":\"password\"}"

# 2. Verify in MySQL
mysql -u root -p
USE Hospital_General_Meeting_Scheduler_DB;
SELECT id, email, name FROM users WHERE email = 'test@test.com';

# 3. Login via frontend
# Go to http://localhost:3000
# Enter: test@test.com / password
# Should successfully login and show dashboard
```

---

## 🚨 Common Connection Issues

### Issue 1: Frontend Can't Reach Backend

**Symptoms**:
- Network error in browser console
- ERR_CONNECTION_REFUSED

**Debug Steps**:
```cmd
# 1. Check backend is running
curl http://localhost:8001/api/health

# 2. Check frontend .env
cat frontend/.env
# Should show: REACT_APP_BACKEND_URL=http://localhost:8001

# 3. Restart frontend after .env change
cd frontend
npm start
```

---

### Issue 2: Backend Can't Reach MySQL

**Symptoms**:
- Backend logs show: "Can't connect to MySQL server"
- Health check returns unhealthy

**Debug Steps**:
```cmd
# 1. Check MySQL is running
net start MySQL80

# 2. Test MySQL connection
mysql -u root -p -h 127.0.0.1

# 3. Verify backend .env credentials
cat backend/.env

# 4. Restart backend
cd backend
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

---

### Issue 3: CORS Errors

**Symptoms**:
- Browser console: "blocked by CORS policy"
- Backend receives request but browser blocks response

**Debug Steps**:
```cmd
# 1. Check backend .env
cat backend/.env
# Should include: CORS_ORIGINS=http://localhost:3000,...

# 2. Check browser is using localhost:3000
# Not 127.0.0.1:3000 (they're different origins)

# 3. Restart backend after CORS changes
```

---

### Issue 4: Authentication Fails

**Symptoms**:
- Login succeeds but subsequent API calls return 401
- Token not being sent with requests

**Debug Steps**:
```javascript
// 1. Check token in browser console
localStorage.getItem('token')

// 2. Check axios interceptor in lib/api.js
// Should add Authorization header

// 3. Clear and re-login
localStorage.clear()
// Login again
```

---

## 📋 Checklist Before Testing

```
☐ MySQL Server is running (port 3306)
☐ Database Hospital_General_Meeting_Scheduler_DB exists
☐ All tables created (run ddl.sql)
☐ Backend .env has correct MySQL credentials
☐ Backend .env has correct CORS_ORIGINS
☐ Frontend .env has REACT_APP_BACKEND_URL=http://localhost:8001
☐ Backend is running on localhost:8001
☐ Frontend is running on localhost:3000
☐ Can access http://localhost:8001/api/health (returns healthy)
☐ Can access http://localhost:3000 (loads React app)
☐ Can login via frontend
☐ API calls visible in browser Network tab
☐ Data visible in MySQL tables
```

---

## 🎯 Quick Verification Script

Save as `verify_connection.sh` (Mac/Linux) or `verify_connection.cmd` (Windows):

```bash
#!/bin/bash
echo "=== Connection Verification ==="
echo ""

echo "1. Testing MySQL..."
mysql -u root -p12345678 -h 127.0.0.1 -e "SELECT 'MySQL OK' as status;" 2>/dev/null
echo ""

echo "2. Testing Backend Health..."
curl -s http://localhost:8001/api/health | python3 -m json.tool
echo ""

echo "3. Testing Frontend..."
curl -s http://localhost:3000 | grep -q "<!DOCTYPE html>" && echo "Frontend OK" || echo "Frontend NOT responding"
echo ""

echo "4. Testing Backend→MySQL connection..."
curl -s http://localhost:8001/api/health | grep -q "MySQL connected" && echo "Backend→MySQL OK" || echo "Backend→MySQL FAILED"
echo ""

echo "=== Verification Complete ==="
```

Run: `bash verify_connection.sh`

---

**This guide should help you understand exactly how your frontend connects to the backend and MySQL!**

Need help? Check the other guides:
- [LOCAL_SETUP_GUIDE.md](LOCAL_SETUP_GUIDE.md) - Complete setup instructions
- [QUICK_START.md](QUICK_START.md) - Quick reference
- [test_local_mysql.md](test_local_mysql.md) - Testing guide
