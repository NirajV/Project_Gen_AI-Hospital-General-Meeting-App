# 🏥 Hospital Meeting App - Complete Setup Guide

**Simple step-by-step guide to deploy on your LAN server**

---

## 📋 Prerequisites

- ✅ Docker & Docker Compose installed
- ✅ Git installed
- ✅ Linux server with network access

---

## 🚀 Step 1: Navigate to Project

```bash
cd ~/hospital-meeting-app/Project_Gen_AI-Hospital-General-Meeting-App
```

---

## ⚙️ Step 2: Create Environment File

Create a `.env` file with your settings:

```bash
cat > .env << 'EOF'
# Server Configuration
SERVER_IP=192.168.1.100  # CHANGE THIS to your server's LAN IP

# MongoDB Configuration
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=YourSecurePassword123
DB_NAME=hospital_meeting_scheduler

# JWT Configuration (change this secret!)
JWT_SECRET=change-this-to-a-secure-random-32-character-string

# CORS Configuration
CORS_ORIGINS=http://192.168.1.100:3000  # CHANGE THIS to match your server IP

# Email Configuration (Optional - for meeting reminders)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EOF
```

**⚠️ IMPORTANT:** 
- Replace `192.168.1.100` with YOUR actual server IP
- Change `MONGO_ROOT_PASSWORD` to a strong password
- Change `JWT_SECRET` to a random 32+ character string

**Find your server IP:**
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

---

## 🔧 Step 3: Fix docker-compose Health Check

Edit `docker-compose.mongodb.yml`:

```bash
nano docker-compose.mongodb.yml
```

Find line 22 (mongodb healthcheck section) and change:

**FROM:**
```yaml
test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
```

**TO:**
```yaml
test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')", "--quiet"]
```

Save (Ctrl+X, Y, Enter)

---

## 🏗️ Step 4: Build Docker Images

```bash
sudo docker compose -f docker-compose.mongodb.yml build
```

**This takes 5-10 minutes.** You'll see:
- ✅ Backend building (Python + FastAPI)
- ✅ Frontend building (React + Nginx with Node 20)
- ✅ MongoDB image downloading

---

## 🚀 Step 5: Start Services

```bash
sudo docker compose -f docker-compose.mongodb.yml up -d
```

**Wait 30-60 seconds for all services to start.**

---

## 📊 Step 6: Verify Services Running

```bash
sudo docker ps
```

**Expected output - all should show "Up (healthy)":**
```
CONTAINER ID   IMAGE                                        STATUS
xxxxx          hospital_mongodb                             Up (healthy)
xxxxx          hospital_backend                             Up (healthy)
xxxxx          hospital_frontend                            Up (healthy)
```

---

## 🗄️ Step 7: Initialize Database

**Create default user and collections:**

```bash
sudo docker exec hospital_mongodb mongosh --eval "
use hospital_meeting_scheduler

// Create collections
db.createCollection('users')
db.createCollection('meetings')

// Create indexes
db.users.createIndex({ 'email': 1 }, { unique: true })
db.meetings.createIndex({ 'date': 1 })
db.meetings.createIndex({ 'status': 1 })

// Create default organizer user
db.users.insertOne({
  id: 'default-organizer-001',
  email: 'organizer@hospital.com',
  password: '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7Qx8Q9P3N6',
  name: 'Hospital Organizer',
  role: 'organizer',
  department: 'Administration',
  phone: '+1-555-0100',
  avatar: '',
  createdAt: new Date()
})

print('✅ Database initialized successfully')
"
```

---

## 🌐 Step 8: Access the Application

**From any device on your LAN, open a browser:**

```
http://192.168.1.100:3000
```
*(Replace with your server IP)*

**Default Login:**
- Email: `organizer@hospital.com`
- Password: `password123`

---

## ✅ You're Done!

Your Hospital Meeting App is now running on your LAN server.

---

## 🔍 Troubleshooting

### Check Logs
```bash
# All services
sudo docker compose -f docker-compose.mongodb.yml logs -f

# Specific service
sudo docker logs hospital_mongodb
sudo docker logs hospital_backend
sudo docker logs hospital_frontend
```

### Restart Services
```bash
sudo docker compose -f docker-compose.mongodb.yml restart
```

### Stop Services
```bash
sudo docker compose -f docker-compose.mongodb.yml down
```

### Rebuild After Code Changes
```bash
sudo docker compose -f docker-compose.mongodb.yml down
sudo docker compose -f docker-compose.mongodb.yml build --no-cache
sudo docker compose -f docker-compose.mongodb.yml up -d
```

---

## 🔐 Security Checklist

After first login:

- [ ] Change default organizer password in the app
- [ ] Update MongoDB password in `.env`
- [ ] Change JWT_SECRET in `.env`
- [ ] Configure firewall to allow only LAN access
- [ ] Set up email notifications (optional)

---

## 📱 Access from Other Devices

Any device on the same network can access:

- **Web App:** `http://YOUR-SERVER-IP:3000`
- **API:** `http://YOUR-SERVER-IP:3000/api/`

**From your phone/tablet:**
1. Connect to same WiFi network
2. Open browser
3. Go to `http://YOUR-SERVER-IP:3000`
4. Login with organizer credentials

---

## 🛑 Common Issues

### Issue 1: "Cannot connect to the server"
```bash
# Check if services are running
sudo docker ps

# Check if firewall is blocking
sudo ufw status
sudo ufw allow 3000
```

### Issue 2: "MongoDB unhealthy"
```bash
# Check MongoDB logs
sudo docker logs hospital_mongodb

# If mongosh not found, edit docker-compose.mongodb.yml line 22:
test: ["CMD", "mongo", "--eval", "db.adminCommand('ping')", "--quiet"]
```

### Issue 3: "Port 27017 already in use"
```bash
# Stop local MongoDB if running
sudo systemctl stop mongod
sudo systemctl disable mongod
```

---

## 📊 What's Running?

| Service | Port | Purpose |
|---------|------|---------|
| Frontend (Nginx) | 3000 | Web interface |
| Backend (FastAPI) | 8001 | API server (internal) |
| MongoDB | 27017 | Database (internal) |

**Note:** Only port 3000 needs to be accessible from your LAN. Ports 8001 and 27017 are internal to Docker network.

---

## 🔄 Data Persistence

Your data is stored in Docker volumes:
- `hospital_mongodb_data` - Database data
- `hospital_uploads_data` - File uploads

**These persist even if you stop/restart containers.**

**To backup:**
```bash
sudo docker exec hospital_mongodb mongodump --out=/tmp/backup
sudo docker cp hospital_mongodb:/tmp/backup ./mongodb_backup
```

---

## 📧 Email Notifications Setup

See `/app/GMAIL_SMTP_SETUP.md` for configuring Gmail for meeting reminders.

---

**Need Help?** Check logs first:
```bash
sudo docker compose -f docker-compose.mongodb.yml logs -f
```

**Success Indicators:**
- ✅ All containers show "Up (healthy)"
- ✅ Can access `http://YOUR-SERVER-IP:3000`
- ✅ Can login with default credentials
- ✅ Other LAN devices can access the app
