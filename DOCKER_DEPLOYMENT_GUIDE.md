# 🚀 Docker Deployment Guide - Hospital Meeting Scheduler

## Complete Step-by-Step Implementation for LAN Server

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Preparation](#server-preparation)
3. [Clone Repository](#clone-repository)
4. [Configuration](#configuration)
5. [Build and Deploy](#build-and-deploy)
6. [Verification](#verification)
7. [Access Application](#access-application)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)

---

## 🔧 Prerequisites

### On Your LAN Server

**1. Operating System:**
- Linux (Ubuntu 20.04+, Debian 11+, CentOS 8+)
- OR macOS 10.15+
- OR Windows Server 2019+ with WSL2

**2. Install Docker:**
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version  # Should show: Docker version 24.0.0+
docker compose version  # Should show: Docker Compose version 2.20.0+
```

**3. Install Git:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install git -y

# CentOS/RHEL
sudo yum install git -y

# Verify
git --version  # Should show: git version 2.x+
```

**4. System Requirements:**
- RAM: Minimum 4GB (8GB+ recommended)
- Disk Space: Minimum 10GB free
- CPU: 2+ cores recommended
- Network: LAN connectivity

---

## 🖥️ Server Preparation

### Step 1: Find Your Server IP Address

```bash
# Linux/macOS
ip addr show  # or: ifconfig

# Look for inet address like: 192.168.1.100
# Example output:
# inet 192.168.1.100/24 brd 192.168.1.255 scope global eth0
```

**Note your server IP:** `192.168.1.100` (example - yours will be different)

---

### Step 2: Create Deployment Directory

```bash
# Create project directory
mkdir -p ~/hospital-meeting-app
cd ~/hospital-meeting-app

# Verify location
pwd  # Should show: /home/username/hospital-meeting-app
```

---

## 📥 Clone Repository

### Step 3: Clone from GitHub

**Option A: Using HTTPS (Recommended)**
```bash
cd ~/hospital-meeting-app

# Clone your repository
git clone https://github.com/YOUR_USERNAME/hospital-meeting-scheduler.git .

# Verify files
ls -la
# Should see: backend/, frontend/, database/, docker-compose.mongodb.yml, etc.
```

**Option B: Using SSH**
```bash
# If you have SSH keys configured
git clone git@github.com:YOUR_USERNAME/hospital-meeting-scheduler.git .
```

**If Repository is Private:**
```bash
# You'll be prompted for username and password
# Use Personal Access Token as password (not your GitHub password)
# Generate token at: https://github.com/settings/tokens
```

---

### Step 4: Verify Repository Contents

```bash
cd ~/hospital-meeting-app

# Check directory structure
tree -L 2  # or use: ls -R

# Expected structure:
# .
# ├── backend/
# │   ├── server.py
# │   ├── Dockerfile
# │   ├── requirements.txt
# │   └── ...
# ├── frontend/
# │   ├── src/
# │   ├── public/
# │   ├── Dockerfile
# │   ├── nginx.conf
# │   ├── package.json
# │   └── ...
# ├── database/
# │   ├── DDL_Mongo.js
# │   └── ...
# ├── docker-compose.mongodb.yml
# └── ...
```

---

## ⚙️ Configuration

### Step 5: Create Environment File

```bash
cd ~/hospital-meeting-app

# Copy example environment file
cp .env.docker.example .env

# Edit with your values
nano .env  # or use: vim .env
```

**Update the following in `.env`:**

```bash
# ============================================
# SERVER CONFIGURATION
# ============================================
# IMPORTANT: Replace with YOUR server's LAN IP
SERVER_IP=192.168.1.100

# ============================================
# MONGODB CONFIGURATION
# ============================================
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=YourSecureMongoPassword123!

# Database name (you can keep this)
DB_NAME=hospital_meeting_scheduler

# ============================================
# BACKEND CONFIGURATION
# ============================================
# Generate a secure random key (minimum 32 characters)
JWT_SECRET=your_very_secure_jwt_secret_key_here_min_32_chars_random_string

# Token expiration (in hours)
JWT_EXPIRATION_HOURS=24

# ============================================
# EMAIL CONFIGURATION (Optional)
# ============================================
# For email notifications - configure these if needed
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password

# ============================================
# CORS ORIGINS
# ============================================
# Add your server IP here
CORS_ORIGINS=http://192.168.1.100:3000,http://localhost:3000
```

**Save and exit:**
- nano: `Ctrl+X`, then `Y`, then `Enter`
- vim: `Esc`, then `:wq`, then `Enter`

---

### Step 6: Generate Secure Passwords

```bash
# Generate random JWT secret (copy output)
openssl rand -base64 48

# Example output: 7B8k2L9m3N5p6Q1r4S8t0U7v2W9x3Y6z1A4b7C0d3E6f8G

# Generate MongoDB password (copy output)
openssl rand -base64 24

# Update .env file with these generated values
```

---

### Step 7: Update Frontend Environment

```bash
cd ~/hospital-meeting-app/frontend

# Create production .env file
cat > .env.production << EOF
# Replace SERVER_IP with your actual LAN IP
REACT_APP_BACKEND_URL=http://192.168.1.100:3000
EOF

# Verify
cat .env.production
```

---

### Step 8: Update Backend Environment

```bash
cd ~/hospital-meeting-app/backend

# Check if .env exists
ls -la .env

# If it doesn't exist, create it from the root .env
# The backend will use environment variables from docker-compose
# No action needed if using docker-compose.mongodb.yml
```

---

## 🐳 Build and Deploy

### Step 9: Build Docker Images

```bash
cd ~/hospital-meeting-app

# Build using MongoDB compose file
docker compose -f docker-compose.mongodb.yml build

# This will take 5-10 minutes on first build
# You'll see output like:
# [+] Building 245.7s (23/23) FINISHED
```

**What's happening:**
- ✅ Building backend Docker image (Python + FastAPI)
- ✅ Building frontend Docker image (Node + React + Nginx)
- ✅ Downloading MongoDB image

---

### Step 10: Start All Services

```bash
# Start all containers in detached mode
docker compose -f docker-compose.mongodb.yml up -d

# You'll see:
# [+] Running 4/4
#  ✔ Network hospital_network     Created
#  ✔ Container hospital_mongodb   Started
#  ✔ Container hospital_backend   Started
#  ✔ Container hospital_frontend  Started
```

---

### Step 11: Monitor Startup

```bash
# Watch logs in real-time
docker compose -f docker-compose.mongodb.yml logs -f

# Press Ctrl+C to stop watching logs (containers keep running)

# Check status of all containers
docker compose -f docker-compose.mongodb.yml ps

# Expected output:
# NAME                  STATUS                   PORTS
# hospital_mongodb      Up (healthy)            27017/tcp
# hospital_backend      Up (healthy)            8001/tcp
# hospital_frontend     Up (healthy)            80/tcp -> 3000/tcp
```

---

## ✅ Verification

### Step 12: Check Container Health

```bash
# View all running containers
docker ps

# Check specific container logs
docker logs hospital_backend
docker logs hospital_frontend
docker logs hospital_mongodb

# Check health status
docker inspect hospital_backend | grep -A 5 Health
docker inspect hospital_frontend | grep -A 5 Health
docker inspect hospital_mongodb | grep -A 5 Health
```

---

### Step 13: Test Backend API

```bash
# Test health endpoint
curl http://localhost:8001/api/health

# Expected response:
# {"status":"healthy","database":"connected",...}

# If using from another machine on LAN:
curl http://192.168.1.100:8001/api/health
```

---

### Step 14: Test Database Connection

```bash
# Connect to MongoDB container
docker exec -it hospital_mongodb mongosh \
  -u admin \
  -p YourMongoPassword \
  --authenticationDatabase admin

# In MongoDB shell, run:
show dbs
use hospital_meeting_scheduler
show collections

# Should show:
# users
# meetings
# patients
# ... (10 collections total)

# Exit MongoDB shell
exit
```

---

## 🌐 Access Application

### Step 15: Access from Same Server

```bash
# Open browser on the server:
# http://localhost:3000

# Or using server IP:
# http://192.168.1.100:3000
```

---

### Step 16: Access from Other LAN Devices

**On any device on the same LAN network:**

1. **Open Web Browser**
2. **Navigate to:** `http://192.168.1.100:3000`
   (Replace with your actual server IP)

3. **You should see:** Hospital Meeting Scheduler login page

---

### Step 17: Create First User

1. Click "Register" or "Sign Up"
2. Fill in user details:
   - Name: Your Name
   - Email: your@email.com
   - Password: Your secure password
   - Role: Doctor/Nurse/Admin
3. Click "Register"
4. Login with your credentials

---

## 🐛 Troubleshooting

### Issue: Containers not starting

```bash
# Check Docker service
sudo systemctl status docker

# Restart Docker
sudo systemctl restart docker

# Check logs
docker compose -f docker-compose.mongodb.yml logs
```

---

### Issue: Port already in use

```bash
# Find what's using port 3000
sudo lsof -i :3000
# or
sudo netstat -tulpn | grep 3000

# Stop the conflicting service or change port in docker-compose.mongodb.yml
```

---

### Issue: Cannot connect to database

```bash
# Check MongoDB container
docker logs hospital_mongodb

# Verify MongoDB is running
docker exec hospital_mongodb mongosh --eval "db.adminCommand('ping')"

# Check connection string in backend
docker exec hospital_backend env | grep MONGO_URL
```

---

### Issue: Frontend shows "Cannot connect to backend"

```bash
# Check backend is running
curl http://localhost:8001/api/health

# Check CORS configuration
docker exec hospital_backend env | grep CORS_ORIGINS

# Verify frontend environment
docker exec hospital_frontend cat /usr/share/nginx/html/env-config.js
```

---

### Issue: Permission denied

```bash
# Fix Docker permissions
sudo usermod -aG docker $USER
newgrp docker

# Fix directory permissions
cd ~/hospital-meeting-app
sudo chown -R $USER:$USER .
```

---

## 🔧 Maintenance

### View Logs

```bash
# All containers
docker compose -f docker-compose.mongodb.yml logs -f

# Specific container
docker logs -f hospital_backend
docker logs -f hospital_frontend
docker logs -f hospital_mongodb

# Last 100 lines
docker logs --tail 100 hospital_backend
```

---

### Stop Application

```bash
cd ~/hospital-meeting-app

# Stop all containers (keeps data)
docker compose -f docker-compose.mongodb.yml stop

# Stop and remove containers (keeps data in volumes)
docker compose -f docker-compose.mongodb.yml down

# Stop and remove everything including volumes (DELETES DATA!)
docker compose -f docker-compose.mongodb.yml down -v
```

---

### Start Application

```bash
cd ~/hospital-meeting-app

# Start containers
docker compose -f docker-compose.mongodb.yml up -d

# Or restart
docker compose -f docker-compose.mongodb.yml restart
```

---

### Update Application

```bash
cd ~/hospital-meeting-app

# Pull latest changes from GitHub
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.mongodb.yml up -d --build

# This will rebuild images and restart containers
```

---

### Backup Database

```bash
# Create backup directory
mkdir -p ~/backups

# Backup MongoDB
docker exec hospital_mongodb mongodump \
  --username admin \
  --password YourMongoPassword \
  --authenticationDatabase admin \
  --out /data/backup

# Copy backup to host
docker cp hospital_mongodb:/data/backup ~/backups/mongodb-$(date +%Y%m%d)

# Verify backup
ls -lh ~/backups/
```

---

### Restore Database

```bash
# Copy backup to container
docker cp ~/backups/mongodb-20260410 hospital_mongodb:/data/restore

# Restore
docker exec hospital_mongodb mongorestore \
  --username admin \
  --password YourMongoPassword \
  --authenticationDatabase admin \
  /data/restore
```

---

## 📊 Monitoring

### Check Resource Usage

```bash
# View container stats
docker stats

# Shows:
# - CPU %
# - Memory usage
# - Network I/O
# - Disk I/O
```

---

### Check Disk Usage

```bash
# Docker disk usage
docker system df

# Volume sizes
docker volume ls
docker volume inspect hospital_mongodb_data
```

---

## 🔐 Security Checklist

### Before Production Use:

- [ ] Change all default passwords in `.env`
- [ ] Generate strong JWT_SECRET (min 32 chars)
- [ ] Update MongoDB password
- [ ] Configure firewall rules
- [ ] Enable HTTPS (optional, using reverse proxy)
- [ ] Backup `.env` file securely
- [ ] Set up regular database backups
- [ ] Review and limit CORS_ORIGINS
- [ ] Update SERVER_IP to actual LAN IP

---

## 📞 Support

**Documentation Files:**
- MongoDB Setup: `/database/MONGODB_SETUP_GUIDE.md`
- API Reference: `/docs/API_REFERENCE.md`
- Features Guide: `/docs/FEATURES.md`

**Container Logs:**
```bash
docker compose -f docker-compose.mongodb.yml logs
```

**Health Checks:**
```bash
curl http://localhost:8001/api/health  # Backend
curl http://localhost:3000              # Frontend
```

---

## 🎯 Quick Reference

### Common Commands

```bash
# Start application
docker compose -f docker-compose.mongodb.yml up -d

# Stop application
docker compose -f docker-compose.mongodb.yml down

# View logs
docker compose -f docker-compose.mongodb.yml logs -f

# Restart all
docker compose -f docker-compose.mongodb.yml restart

# Rebuild and restart
docker compose -f docker-compose.mongodb.yml up -d --build

# Check status
docker compose -f docker-compose.mongodb.yml ps

# Remove everything (including data!)
docker compose -f docker-compose.mongodb.yml down -v
```

---

## ✅ Success Checklist

After deployment, verify:

- [ ] All 3 containers running: `docker ps`
- [ ] All containers healthy: `docker compose ps`
- [ ] Backend health: `curl http://localhost:8001/api/health`
- [ ] Frontend accessible: `http://192.168.1.100:3000`
- [ ] Database has 10 collections: `docker exec -it hospital_mongodb mongosh`
- [ ] Can register new user
- [ ] Can login successfully
- [ ] Can create a meeting
- [ ] Can add patients

---

**Deployment Complete! 🎉**

Your Hospital Meeting Scheduler is now running on your LAN server and accessible to all devices on your local network!
