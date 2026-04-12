# MongoDB Quick Reference - Hospital Meeting Scheduler

## 🚀 Quick Setup Commands

```bash
# 1. Start MongoDB
mongod  # or: brew services start mongodb-community

# 2. Run DDL Script
mongosh < /app/database/DDL_Mongo.js

# 3. Verify
mongosh hospital_meeting_scheduler --eval "show collections"
```

---

## 📊 Database Structure

```
hospital_meeting_scheduler/
├── users (10k+ records expected)
├── user_sessions (transient, TTL)
├── patients (100k+ records expected)
├── meetings (50k+ records expected)
├── meeting_participants (200k+ records)
├── meeting_patients (150k+ records) ← Has approval_status
├── agenda_items (500k+ records)
├── decision_logs (300k+ records)
├── files (100k+ records)
└── feedback (10k+ records)
```

---

## 🔍 Common Queries

### Users
```javascript
// Find user by email
db.users.findOne({ email: "organizer@hospital.com" })

// Count active doctors
db.users.countDocuments({ role: "doctor", is_active: true })

// List all users
db.users.find({}, { _id: 0, name: 1, email: 1, role: 1 }).limit(10)
```

### Meetings
```javascript
// Find upcoming meetings
db.meetings.find({ 
  meeting_date: { $gte: "2026-04-10" },
  status: "scheduled"
}).sort({ meeting_date: 1 })

// Meetings by organizer
db.meetings.find({ organizer_id: "user-id-here" })

// Count completed meetings
db.meetings.countDocuments({ status: "completed" })
```

### Patients
```javascript
// Find patient by ID
db.patients.findOne({ patient_id_number: "P-12345" })

// Search patients by name
db.patients.find({ 
  $or: [
    { first_name: /amit/i },
    { last_name: /amit/i }
  ]
})
```

### Meeting Patients (with Approval)
```javascript
// Find pending patients
db.meeting_patients.find({ approval_status: "pending" })

// Patients added by specific user
db.meeting_patients.find({ added_by: "user-id" })

// Approved patients in a meeting
db.meeting_patients.find({ 
  meeting_id: "meeting-id",
  approval_status: "approved"
})
```

### Participants
```javascript
// Get all participants for a meeting
db.meeting_participants.find({ meeting_id: "meeting-id" })

// Meetings user is attending
db.meeting_participants.find({ user_id: "user-id" })

// Accepted participants only
db.meeting_participants.find({ response_status: "accepted" })
```

---

## 🔧 Maintenance Commands

### Backup
```bash
# Backup entire database
mongodump --db hospital_meeting_scheduler --out ~/backups/$(date +%Y%m%d)

# Backup single collection
mongodump --db hospital_meeting_scheduler --collection users --out ~/backups/users
```

### Restore
```bash
# Restore database
mongorestore --db hospital_meeting_scheduler ~/backups/20260410/hospital_meeting_scheduler

# Restore single collection
mongorestore --db hospital_meeting_scheduler --collection users ~/backups/users
```

### Performance
```javascript
// Check collection stats
db.meetings.stats()

// View slow queries (enable profiling first)
db.setProfilingLevel(2)
db.system.profile.find({ millis: { $gt: 100 } }).sort({ ts: -1 })

// Index usage statistics
db.meetings.aggregate([{ $indexStats: {} }])
```

### Cleanup
```javascript
// Remove old sessions (if TTL not working)
db.user_sessions.deleteMany({ 
  expires_at: { $lt: new Date().toISOString() }
})

// Remove cancelled meetings older than 1 year
db.meetings.deleteMany({ 
  status: "cancelled",
  created_at: { $lt: "2025-01-01" }
})
```

---

## 📈 Monitoring

### Database Size
```javascript
// Database stats
db.stats(1024*1024)  // Size in MB

// Collection sizes
db.users.stats(1024*1024)
db.meetings.stats(1024*1024)
```

### Index Performance
```javascript
// Explain query
db.meetings.find({ meeting_date: "2026-04-10" }).explain("executionStats")

// Check index usage
db.meetings.aggregate([
  { $indexStats: {} },
  { $sort: { "accesses.ops": -1 } }
])
```

### Active Operations
```javascript
// Current operations
db.currentOp()

// Kill slow operation
db.killOp(operation_id)
```

---

## 🔐 User Management

### Create Application User
```javascript
use hospital_meeting_scheduler

db.createUser({
  user: "meeting_app",
  pwd: "secure_password_here",
  roles: [
    { role: "readWrite", db: "hospital_meeting_scheduler" }
  ]
})
```

### Connection String
```env
MONGO_URL=mongodb://meeting_app:secure_password_here@localhost:27017
```

---

## 🐛 Troubleshooting

### Check MongoDB Status
```bash
# Linux
sudo systemctl status mongod

# macOS
brew services list | grep mongodb

# Process check
ps aux | grep mongod
```

### Connection Test
```bash
mongosh --eval "db.adminCommand('ping')"
```

### View Logs
```bash
# Default log location
tail -f /var/log/mongodb/mongod.log  # Linux
tail -f /usr/local/var/log/mongodb/mongo.log  # macOS
```

### Reset Collection
```javascript
// Drop and recreate
db.users.drop()
// Then re-run DDL script for that collection
```

---

## 📝 Schema Examples

### Create User Document
```javascript
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  email: "doctor@hospital.com",
  name: "Dr. John Smith",
  password_hash: "$2b$12$...",
  role: "doctor",
  specialty: "Cardiology",
  is_active: true,
  requires_password_change: false,
  created_at: "2026-04-10T10:30:00Z"
}
```

### Create Meeting Document
```javascript
{
  id: "meeting-uuid",
  title: "Weekly Tumor Board",
  meeting_date: "2026-04-15",
  start_time: "14:00",
  end_time: "15:30",
  meeting_type: "video",
  status: "scheduled",
  organizer_id: "user-uuid",
  created_at: "2026-04-10T10:30:00Z"
}
```

### Create Meeting Patient (with Approval)
```javascript
{
  id: "mp-uuid",
  meeting_id: "meeting-uuid",
  patient_id: "patient-uuid",
  clinical_question: "Treatment options for Stage II",
  status: "new_case",
  added_by: "participant-user-id",
  added_by_name: "Dr. Sarah Lee",
  approval_status: "pending",  // or "approved"
  approved_by: null,
  approved_by_name: null,
  approved_at: null,
  created_at: "2026-04-10T10:30:00Z"
}
```

---

## 📞 Support

**Documentation:** `/app/database/MONGODB_SETUP_GUIDE.md`  
**Script:** `/app/database/DDL_Mongo.js`  
**MongoDB Docs:** https://docs.mongodb.com/
