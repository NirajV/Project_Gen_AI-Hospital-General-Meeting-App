# 🚀 MongoDB Health Check - Quick Fix

**Issue:** MongoDB health check failing  
**Fix Applied:** Updated health check syntax for MongoDB 6.0

---

## ✅ What Was Changed

**File:** `docker-compose.mongodb.yml`

**Before:**
```yaml
healthcheck:
  test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
```

**After:**
```yaml
healthcheck:
  test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')", "--quiet"]
```

**Why:** The old syntax (pipe with echo) doesn't work reliably in Docker health checks. The new array syntax is the proper Docker health check format.

---

## 🔄 Apply the Fix

### Step 1: Stop Containers
```bash
cd ~/hospital-meeting-app/Project_Gen_AI-Hospital-General-Meeting-App
sudo docker compose -f docker-compose.mongodb.yml down
```

### Step 2: Pull Updated Config
Since I've updated the `docker-compose.mongodb.yml` file in the Emergent platform, you need to get the updated version to your local machine.

**Option A: Copy the updated section manually**

Edit your local `docker-compose.mongodb.yml` file and replace line 22 with:
```yaml
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')", "--quiet"]
```

**Option B: Re-download from your repo** (if you're syncing changes)

### Step 3: Start Services
```bash
sudo docker compose -f docker-compose.mongodb.yml up -d
```

### Step 4: Monitor Startup
```bash
# Watch logs (Ctrl+C to exit)
sudo docker compose -f docker-compose.mongodb.yml logs -f

# Or check status after 1 minute
sudo docker ps
```

---

## 🔍 Expected Result

After 30-40 seconds, all containers should be healthy:

```bash
sudo docker ps

# You should see:
# hospital_mongodb    Up (healthy)
# hospital_backend    Up (healthy)  
# hospital_frontend   Up (healthy)
```

---

## ⚠️ If Still Failing

### Quick Diagnostic
```bash
# Check if mongosh exists in container
sudo docker exec hospital_mongodb which mongosh

# If not found, try with 'mongo' instead
sudo docker exec hospital_mongodb which mongo
```

### Alternative: Use 'mongo' shell (fallback)

If `mongosh` is not available, edit the health check to use `mongo`:

```yaml
healthcheck:
  test: ["CMD", "mongo", "--eval", "db.adminCommand('ping')", "--quiet"]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 40s
```

---

## 🎯 Quick Test

Once containers are up:

```bash
# Test MongoDB connection
sudo docker exec hospital_mongodb mongosh --eval "db.adminCommand('ping')"

# Expected output: { ok: 1 }
```

---

## 📋 Next Steps After Success

1. ✅ Create `.env` file with your server IP
2. ✅ Initialize database (see `/app/DOCKER_DEPLOYMENT_QUICKSTART.md`)
3. ✅ Access app at `http://YOUR-SERVER-IP:3000`

---

**Run the commands above and let me know the result!**
