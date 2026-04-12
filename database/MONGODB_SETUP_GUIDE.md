# MongoDB Local Setup Guide

## 📋 Overview

This guide will help you set up the MongoDB database for the Hospital Meeting Scheduler application on your local machine.

**Database Name:** `hospital_meeting_scheduler`  
**Script Location:** `/app/database/DDL_Mongo.js`

---

## 🔧 Prerequisites

1. **MongoDB Installed**
   - Download: https://www.mongodb.com/try/download/community
   - Version: 5.0 or higher recommended

2. **MongoDB Shell (mongosh)**
   - Included with MongoDB installation
   - Verify: `mongosh --version`

---

## 🚀 Quick Start (3 Steps)

### Step 1: Start MongoDB

**On macOS/Linux:**
```bash
# Using Homebrew
brew services start mongodb-community

# OR using systemd
sudo systemctl start mongod

# OR manually
mongod --dbpath /path/to/your/data/directory
```

**On Windows:**
```cmd
# Start as service
net start MongoDB

# OR manually
"C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe"
```

---

### Step 2: Run the DDL Script

**Option A: Execute from file (Recommended)**
```bash
mongosh < /app/database/DDL_Mongo.js
```

**Option B: Load in interactive shell**
```bash
mongosh
```
Then in the mongosh shell:
```javascript
load('/app/database/DDL_Mongo.js')
```

**Option C: Copy-paste method**
```bash
# 1. Open the script
cat /app/database/DDL_Mongo.js

# 2. Copy all content
# 3. Open mongosh
mongosh

# 4. Paste and press Enter
```

---

### Step 3: Verify Setup

**Check collections were created:**
```bash
mongosh

# In mongosh shell:
use hospital_meeting_scheduler
show collections
```

**Expected output:**
```
agenda_items
decision_logs
feedback
files
meeting_patients
meeting_participants
meetings
patients
user_sessions
users
```

**Check indexes:**
```javascript
// In mongosh
use hospital_meeting_scheduler
db.users.getIndexes()
db.meetings.getIndexes()
```

---

## 🗄️ Database Schema

### Collections Created

| Collection | Purpose | Key Indexes |
|------------|---------|-------------|
| **users** | User accounts | email (unique), id (unique) |
| **user_sessions** | OAuth sessions | session_token (unique), TTL on expires_at |
| **patients** | Patient records | id (unique), patient_id_number |
| **meetings** | Meeting schedules | id (unique), meeting_date, organizer_id |
| **meeting_participants** | Meeting attendees | (meeting_id, user_id) unique |
| **meeting_patients** | Patients in meetings | (meeting_id, patient_id) unique, approval_status |
| **agenda_items** | Meeting agenda | meeting_id, patient_id, order_number |
| **decision_logs** | Clinical decisions | meeting_id, priority, created_at |
| **files** | Uploaded files | meeting_id, uploaded_by |
| **feedback** | User feedback | user_id, feedback_type, status |

---

## 🔍 What the Script Does

### 1. Schema Validation
Each collection has JSON Schema validation to ensure data integrity:
- Required fields are enforced
- Data types are validated
- Enum fields have predefined values
- Email formats are validated

### 2. Indexes Created
- **Unique indexes** on IDs and emails
- **Compound indexes** for queries (meeting_id + user_id)
- **TTL index** on user_sessions for automatic expiration
- **Performance indexes** on frequently queried fields

### 3. Special Features
- **Patient Approval System**: `meeting_patients` has `approval_status` field
- **Session Expiration**: `user_sessions` auto-deletes expired sessions
- **Audit Trail**: `created_at` and `updated_at` timestamps

---

## ⚙️ Configure Your Application

After running the DDL script, update your backend configuration:

**File:** `/app/backend/.env`

```env
# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017
DB_NAME=hospital_meeting_scheduler

# Other settings...
```

**Verify connection:**
```bash
cd /app/backend
python3 -c "from motor.motor_asyncio import AsyncIOMotorClient; import os; from dotenv import load_dotenv; load_dotenv(); client = AsyncIOMotorClient(os.environ['MONGO_URL']); print('✓ Connected to MongoDB')"
```

---

## 🧪 Testing the Setup

### 1. Check Database Exists
```bash
mongosh --eval "db.getMongo().getDBNames()" | grep hospital_meeting_scheduler
```

### 2. Count Collections
```bash
mongosh hospital_meeting_scheduler --eval "db.getCollectionNames().length"
```
**Expected:** 10

### 3. Test Insert (Optional)
```javascript
use hospital_meeting_scheduler

// Insert test user
db.users.insertOne({
  id: "test-123",
  email: "test@hospital.com",
  name: "Test User",
  role: "doctor",
  is_active: true,
  created_at: new Date().toISOString()
})

// Verify
db.users.findOne({ email: "test@hospital.com" })

// Clean up
db.users.deleteOne({ id: "test-123" })
```

---

## 🔄 Reset Database (if needed)

**Warning: This deletes all data!**

```javascript
use hospital_meeting_scheduler
db.dropDatabase()

// Then re-run the DDL script
load('/app/database/DDL_Mongo.js')
```

---

## 📊 Useful MongoDB Commands

### View All Collections
```javascript
show collections
```

### Count Documents
```javascript
db.users.countDocuments()
db.meetings.countDocuments()
```

### View Sample Documents
```javascript
db.users.findOne()
db.meetings.find().limit(5)
```

### Check Indexes
```javascript
db.users.getIndexes()
db.meetings.getIndexes()
```

### Database Stats
```javascript
db.stats()
```

---

## 🐛 Troubleshooting

### Issue: "mongosh: command not found"
**Solution:**
```bash
# macOS
brew install mongosh

# Linux
wget https://downloads.mongodb.com/compass/mongosh-1.10.6-linux-x64.tgz
tar -zxvf mongosh-1.10.6-linux-x64.tgz
sudo cp mongosh-1.10.6-linux-x64/bin/mongosh /usr/local/bin/
```

---

### Issue: "Connection refused to localhost:27017"
**Solution:**
```bash
# Check if MongoDB is running
ps aux | grep mongod

# Start MongoDB
sudo systemctl start mongod  # Linux
brew services start mongodb-community  # macOS
```

---

### Issue: "Schema validation failed"
**Solution:**
- Check your document matches the required fields
- Ensure data types are correct (string, int, bool)
- Verify enum values are valid

**View validation rules:**
```javascript
db.getCollectionInfos({ name: "users" })[0].options.validator
```

---

### Issue: "Duplicate key error"
**Solution:**
- Ensure `id` and `email` fields are unique
- Check for existing documents:
```javascript
db.users.findOne({ email: "your@email.com" })
```

---

## 🔐 Production Considerations

### 1. Authentication
For production, enable authentication:
```bash
mongod --auth
```

Create admin user:
```javascript
use admin
db.createUser({
  user: "admin",
  pwd: "secure_password",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase"]
})
```

Update `.env`:
```env
MONGO_URL=mongodb://admin:secure_password@localhost:27017
```

---

### 2. Backup
```bash
# Backup database
mongodump --db hospital_meeting_scheduler --out /path/to/backup

# Restore database
mongorestore --db hospital_meeting_scheduler /path/to/backup/hospital_meeting_scheduler
```

---

### 3. Performance Tuning
```javascript
// Analyze slow queries
db.setProfilingLevel(2)
db.system.profile.find().limit(5).sort({ ts: -1 }).pretty()

// Check index usage
db.meetings.aggregate([{ $indexStats: {} }])
```

---

## 📚 Additional Resources

- **MongoDB Manual**: https://docs.mongodb.com/manual/
- **Schema Validation**: https://docs.mongodb.com/manual/core/schema-validation/
- **Indexes**: https://docs.mongodb.com/manual/indexes/
- **mongosh**: https://docs.mongodb.com/mongodb-shell/

---

## ✅ Verification Checklist

Before starting your application:

- [ ] MongoDB is running (`ps aux | grep mongod`)
- [ ] Database created (`show dbs` in mongosh)
- [ ] 10 collections exist (`show collections`)
- [ ] Indexes created (check with `db.users.getIndexes()`)
- [ ] `.env` configured with correct `MONGO_URL` and `DB_NAME`
- [ ] Backend can connect (test with Python script above)

---

## 🎯 Next Steps

1. ✅ MongoDB setup complete
2. ➡️ Start backend: `cd /app/backend && uvicorn server:app --reload`
3. ➡️ Start frontend: `cd /app/frontend && yarn start`
4. ➡️ Register first user at: `http://localhost:3000/register`

---

**Last Updated:** April 10, 2026  
**MongoDB Version:** 5.0+  
**Collections:** 10  
**Total Indexes:** 40+
