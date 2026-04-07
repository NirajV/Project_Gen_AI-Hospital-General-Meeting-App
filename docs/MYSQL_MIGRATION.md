# 🔄 MySQL Migration Guide

> Guide for migrating from MongoDB to MySQL database

**Date:** April 6, 2026  
**Version:** 2.0.0  
**Database:** MySQL 8.0

---

## 📋 What Changed

### Database Migration: MongoDB → MySQL

The application now uses **MySQL 8.0** instead of MongoDB for better:
- ✅ **Relational Integrity** - Foreign key constraints
- ✅ **ACID Compliance** - Transaction support
- ✅ **Maturity** - Well-established database system
- ✅ **Tooling** - Extensive management tools
- ✅ **SQL Support** - Standard query language

---

## 📁 New Files Created

1. **`/app/database/ddl.sql`** (630+ lines)
   - Complete MySQL schema
   - All 9 tables with indexes
   - Foreign key relationships
   - Default test users
   - Utility views

2. **`/app/docs/DEPLOYMENT.md`** (Updated)
   - Step-by-step MySQL setup
   - Docker Compose configuration
   - Database management commands
   - Troubleshooting guide

3. **`/app/docker-compose.yml`** (Updated)
   - MySQL 8.0 service
   - Automatic schema initialization
   - Health checks
   - Volume persistence

4. **`/app/.env.example`** (Updated)
   - MySQL connection settings
   - Production configuration templates

---

## 🗄️ Database Schema

### Tables Created

| Table | Rows (Default) | Purpose |
|-------|----------------|---------|
| **users** | 2 | User accounts (doctors, organizers, nurses, admins) |
| **patients** | 0 | Patient records and medical information |
| **meetings** | 0 | Hospital case meetings and conferences |
| **meeting_participants** | 0 | Junction table: users ↔ meetings |
| **meeting_patients** | 0 | Junction table: patients ↔ meetings |
| **agenda_items** | 0 | Meeting agenda items and treatment plans |
| **decision_logs** | 0 | Clinical decisions from meetings |
| **file_attachments** | 0 | Uploaded documents and files |
| **feedback** | 0 | User feedback submissions |

### Key Features

✅ **Foreign Key Constraints** - Referential integrity enforced  
✅ **Indexes** - Optimized query performance  
✅ **Full-Text Search** - Patient name and diagnosis search  
✅ **Cascading Deletes** - Automatic cleanup of related records  
✅ **Default Test Users** - Pre-populated for testing  
✅ **Utility Views** - Convenient queries for common data

---

## 🚀 Getting Started with MySQL

### Quick Start

```bash
# 1. Ensure Docker is running
docker --version

# 2. Start services
docker-compose up -d

# 3. Wait for MySQL initialization (~15 seconds)
docker-compose logs -f mysql

# 4. Access application
open http://localhost:3000
```

### Default Login Credentials

| Email | Password | Role |
|-------|----------|------|
| organizer@hospital.com | password123 | Organizer |
| doctor@hospital.com | password123 | Doctor |

---

## 🔧 Configuration

### Environment Variables

**Required MySQL Settings in `.env`:**

```env
# MySQL Database
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=hospital_meeting_scheduler
MYSQL_USER=hospital_user
MYSQL_PASSWORD=hospital_pass
MYSQL_PORT=3306
```

### Connection String Format

```
mysql://hospital_user:hospital_pass@mysql:3306/hospital_meeting_scheduler
```

---

## 💻 Database Management

### Access MySQL Shell

```bash
# Connect to MySQL container
docker exec -it hospital_mysql mysql -u hospital_user -p
# Password: hospital_pass

# Show databases
SHOW DATABASES;

# Use the hospital database
USE hospital_meeting_scheduler;

# Show all tables
SHOW TABLES;

# View users
SELECT id, email, name, role FROM users;
```

### Useful Queries

**Get all meetings with organizer:**
```sql
SELECT 
    m.title,
    m.meeting_date,
    m.start_time,
    u.name AS organizer_name,
    m.status
FROM meetings m
JOIN users u ON m.organizer_id = u.id
ORDER BY m.meeting_date DESC;
```

**Get meeting participants:**
```sql
SELECT 
    m.title AS meeting_title,
    u.name AS participant_name,
    u.specialty,
    mp.response_status
FROM meeting_participants mp
JOIN meetings m ON mp.meeting_id = m.id
JOIN users u ON mp.user_id = u.id;
```

**Get patients by department:**
```sql
SELECT 
    CONCAT(first_name, ' ', last_name) AS patient_name,
    patient_id_number AS MRN,
    primary_diagnosis,
    department_name
FROM patients
WHERE is_active = TRUE
ORDER BY department_name, last_name;
```

---

## 🔄 Data Migration (If needed)

### From MongoDB to MySQL

If you have existing data in MongoDB, use this process:

**Step 1: Export MongoDB Data**
```bash
# Export users
mongoexport --db=hospital_meeting_db --collection=users --out=users.json

# Export patients
mongoexport --db=hospital_meeting_db --collection=patients --out=patients.json

# Export meetings
mongoexport --db=hospital_meeting_db --collection=meetings --out=meetings.json
```

**Step 2: Transform Data**

Create Python script `migrate.py`:
```python
import json
import mysql.connector

# Connect to MySQL
db = mysql.connector.connect(
    host="localhost",
    user="hospital_user",
    password="hospital_pass",
    database="hospital_meeting_scheduler"
)
cursor = db.cursor()

# Read MongoDB export
with open('users.json') as f:
    users = [json.loads(line) for line in f]

# Insert into MySQL
for user in users:
    cursor.execute("""
        INSERT INTO users (id, email, name, password_hash, specialty, role, is_active, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        user['id'],
        user['email'],
        user['name'],
        user['password_hash'],
        user.get('specialty'),
        user['role'],
        user['is_active'],
        user['created_at']
    ))

db.commit()
print(f"Migrated {len(users)} users")
```

**Step 3: Run Migration**
```bash
python migrate.py
```

---

## 📊 Monitoring & Maintenance

### Health Checks

```bash
# Check MySQL status
docker-compose ps mysql

# View MySQL logs
docker-compose logs -f mysql

# Test connection
docker exec hospital_mysql mysqladmin ping -h localhost
```

### Backup Database

```bash
# Create backup
docker exec hospital_mysql mysqldump \
  -u hospital_user -phospital_pass \
  hospital_meeting_scheduler > backup_$(date +%Y%m%d).sql

# Compress backup
gzip backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
# Restore from backup
docker exec -i hospital_mysql mysql \
  -u hospital_user -phospital_pass \
  hospital_meeting_scheduler < backup_20260406.sql
```

### Optimize Tables

```sql
-- Run periodically for performance
OPTIMIZE TABLE users, patients, meetings, meeting_participants;

-- Analyze for better query plans
ANALYZE TABLE users, patients, meetings;

-- Check table status
SHOW TABLE STATUS;
```

---

## 🐛 Troubleshooting

### Issue: "Table doesn't exist"

**Solution:**
```bash
# Re-run DDL script
docker exec -i hospital_mysql mysql \
  -u hospital_user -phospital_pass \
  hospital_meeting_scheduler < database/ddl.sql
```

### Issue: "Access denied for user"

**Solution:**
```bash
# Check environment variables
docker exec hospital_mysql env | grep MYSQL

# Recreate user
docker exec -it hospital_mysql mysql -u root -p
# Then run:
# DROP USER IF EXISTS 'hospital_user'@'%';
# CREATE USER 'hospital_user'@'%' IDENTIFIED BY 'hospital_pass';
# GRANT ALL PRIVILEGES ON hospital_meeting_scheduler.* TO 'hospital_user'@'%';
# FLUSH PRIVILEGES;
```

### Issue: MySQL container keeps restarting

**Solution:**
```bash
# Check logs
docker-compose logs mysql

# Common fixes:
# 1. Wait longer (MySQL takes 10-15 seconds)
# 2. Check volume permissions
# 3. Increase Docker memory (Settings → Resources)
# 4. Reset database:
docker-compose down -v
docker-compose up -d
```

---

## 📝 Schema Differences: MongoDB vs MySQL

### MongoDB (Old)
```javascript
{
  "_id": ObjectId("..."),
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name"
}
```

### MySQL (New)
```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL
);
```

### Key Changes

| Feature | MongoDB | MySQL |
|---------|---------|-------|
| **IDs** | `_id` ObjectId + `id` UUID | `id` VARCHAR(36) PRIMARY KEY |
| **Relationships** | Manual references | Foreign key constraints |
| **Validation** | Application-level | Database-level |
| **Queries** | NoSQL aggregations | Standard SQL |
| **Transactions** | Limited | Full ACID support |

---

## ✅ Verification Steps

After migration, verify:

1. **Database Created:**
   ```bash
   docker exec hospital_mysql mysql -u hospital_user -phospital_pass \
     -e "SHOW DATABASES;"
   ```

2. **Tables Created:**
   ```bash
   docker exec hospital_mysql mysql -u hospital_user -phospital_pass \
     -e "SHOW TABLES FROM hospital_meeting_scheduler;"
   ```

3. **Default Users Exist:**
   ```bash
   docker exec hospital_mysql mysql -u hospital_user -phospital_pass \
     -e "SELECT email, role FROM hospital_meeting_scheduler.users;"
   ```

4. **Backend Connected:**
   ```bash
   curl http://localhost:8001/api/health
   ```

5. **Login Works:**
   - Open http://localhost:3000
   - Login with: organizer@hospital.com / password123

---

## 🎯 Next Steps

1. **Update Backend Code** (if needed)
   - Replace MongoDB driver with MySQL connector
   - Update queries from NoSQL to SQL
   - Implement proper transactions

2. **Test All Features**
   - User authentication
   - Meeting creation
   - Patient management
   - File uploads
   - Email notifications

3. **Performance Tuning**
   - Add indexes for slow queries
   - Optimize table structures
   - Configure MySQL buffers

4. **Production Deployment**
   - Change default passwords
   - Enable SSL/TLS
   - Set up automated backups
   - Configure monitoring

---

## 📞 Support

For MySQL-specific issues:
- **MySQL Docs:** https://dev.mysql.com/doc/
- **Docker MySQL:** https://hub.docker.com/_/mysql
- **Email:** Niraj.K.Vishwakarma@gmail.com

---

**Migration Version:** 2.0.0  
**Database:** MySQL 8.0  
**Status:** ✅ Complete
