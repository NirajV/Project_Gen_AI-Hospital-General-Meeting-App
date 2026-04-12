# 🔍 MongoDB Container Troubleshooting Guide

**Issue:** MongoDB container is unhealthy and preventing other services from starting

---

## 🔧 Step 1: Check MongoDB Logs

Run this on your server:

```bash
cd ~/hospital-meeting-app/Project_Gen_AI-Hospital-General-Meeting-App

# Check MongoDB logs
sudo docker logs hospital_mongodb 2>&1 | tail -100
```

**Look for common errors:**
- ❌ Authentication failures
- ❌ Port already in use (27017)
- ❌ Init script errors
- ❌ Permission issues
- ❌ mongosh command not found

---

## 🛠️ Common Fixes

### Fix 1: Port 27017 Already in Use

**Check if MongoDB is already running on host:**
```bash
sudo lsof -i :27017
# OR
sudo netstat -tulpn | grep 27017
```

**If found, stop it:**
```bash
# Stop system MongoDB service
sudo systemctl stop mongod
sudo systemctl disable mongod

# OR kill the process
sudo kill -9 <PID>
```

### Fix 2: Health Check Issue (mongosh not found)

The health check in docker-compose uses `mongosh` which might not be available in mongo:6.0.

**Update docker-compose.mongodb.yml:**

**Find this section (around line 22):**
```yaml
healthcheck:
  test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 40s
```

**Replace with:**
```yaml
healthcheck:
  test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 40s
```

**OR use mongo shell (older syntax):**
```yaml
healthcheck:
  test: ["CMD", "mongo", "--eval", "db.adminCommand('ping')"]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 40s
```

### Fix 3: Init Script Permissions

**Check the DDL script:**
```bash
ls -la ~/hospital-meeting-app/Project_Gen_AI-Hospital-General-Meeting-App/database/DDL_Mongo.js
```

**Ensure it's readable:**
```bash
chmod 644 ~/hospital-meeting-app/Project_Gen_AI-Hospital-General-Meeting-App/database/DDL_Mongo.js
```

### Fix 4: Clean Restart

**Stop everything and clean volumes:**
```bash
cd ~/hospital-meeting-app/Project_Gen_AI-Hospital-General-Meeting-App

# Stop all containers
sudo docker compose -f docker-compose.mongodb.yml down

# Remove volumes (WARNING: This deletes all database data!)
sudo docker volume rm hospital_mongodb_data hospital_mongodb_config

# Start fresh
sudo docker compose -f docker-compose.mongodb.yml up -d
```

---

## 🔍 Diagnostic Commands

**Check container status:**
```bash
sudo docker ps -a | grep hospital
```

**Check health status:**
```bash
sudo docker inspect hospital_mongodb | grep -A 10 Health
```

**Follow logs in real-time:**
```bash
sudo docker logs -f hospital_mongodb
```

**Check MongoDB is responding:**
```bash
# Wait 30 seconds after starting, then test
sudo docker exec hospital_mongodb mongosh --eval "db.adminCommand('ping')"
```

---

## 🎯 Quick Fix - Most Likely Issues

### Issue 1: mongosh vs mongo command

MongoDB 6.0 uses `mongosh` but the image might have the old `mongo` shell.

**Test which is available:**
```bash
sudo docker exec hospital_mongodb which mongosh
sudo docker exec hospital_mongodb which mongo
```

### Issue 2: Authentication Issues

The health check might fail due to authentication.

**Try health check without auth:**
```yaml
healthcheck:
  test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')", "--quiet"]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 40s
```

---

## 📋 After You Run Diagnostics

**Please share the output of:**

1. MongoDB logs:
   ```bash
   sudo docker logs hospital_mongodb 2>&1 | tail -100
   ```

2. Container status:
   ```bash
   sudo docker ps -a | grep hospital
   ```

3. Health check details:
   ```bash
   sudo docker inspect hospital_mongodb | grep -A 10 Health
   ```

**Then I can provide a precise fix!**

---

## 🚀 Alternative: Skip Health Checks Temporarily

If you want to test the app quickly, you can temporarily disable health checks:

**Edit docker-compose.mongodb.yml:**

Comment out the health checks and depends_on conditions:
```yaml
# mongodb:
#   healthcheck:
#     test: ...  # Comment this entire section

# backend:
#   depends_on:
#     mongodb:
#       condition: service_healthy  # Remove this, use just: depends_on: [mongodb]
```

Then restart:
```bash
sudo docker compose -f docker-compose.mongodb.yml up -d
```

**Note:** This is just for testing. Health checks are important for production.
