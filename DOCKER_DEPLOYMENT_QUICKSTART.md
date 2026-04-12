# 🚀 Hospital Meeting App - Docker Deployment Quick Start

## ✅ Prerequisites Installed
- Docker & Docker Compose
- Git (for cloning if needed)

---

## 📦 Deployment Steps (Updated December 2025)

### Step 1: Navigate to Project
```bash
cd ~/hospital-meeting-app/Project_Gen_AI-Hospital-General-Meeting-App
```

### Step 2: Configure Environment Variables
Create a `.env` file in the project root:

```bash
# Create .env file
cat > .env << 'EOF'
# Server Configuration
SERVER_IP=192.168.1.100  # Replace with your LAN IP

# MongoDB Configuration
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=your_secure_password_here
DB_NAME=hospital_meeting_scheduler

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# CORS Configuration
CORS_ORIGINS=http://192.168.1.100:3000  # Replace with your server IP

# Email Configuration (Optional - for meeting reminders)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EOF
```

**⚠️ Important:** Replace `192.168.1.100` with your actual server's LAN IP address.

### Step 3: Build Docker Images
```bash
sudo docker compose -f docker-compose.mongodb.yml build
```

**This will take 5-10 minutes on first build:**
- ✅ Downloads Node 20 image
- ✅ Installs all dependencies
- ✅ Builds React production bundle
- ✅ Sets up MongoDB, Backend, and Frontend containers

### Step 4: Start Services
```bash
sudo docker compose -f docker-compose.mongodb.yml up -d
```

### Step 5: Initialize MongoDB (First Time Only)
```bash
# Wait 30 seconds for MongoDB to fully start
sleep 30

# Run the initialization script
sudo docker exec hospital_mongodb mongosh --eval "
use hospital_meeting_scheduler

// Create users collection with indexes
db.createCollection('users')
db.users.createIndex({ 'email': 1 }, { unique: true })

// Create meetings collection
db.createCollection('meetings')
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

**Default Login Credentials:**
- Email: `organizer@hospital.com`
- Password: `password123`

### Step 6: Verify Deployment
```bash
# Check all services are running
sudo docker compose -f docker-compose.mongodb.yml ps

# Expected output: All services should show "Up (healthy)"
```

### Step 7: Access the Application
Open a browser on any device in your LAN:

```
http://192.168.1.100:3000
```
*(Replace with your actual server IP)*

---

## 🔍 Troubleshooting

### Check Logs
```bash
# All services
sudo docker compose -f docker-compose.mongodb.yml logs -f

# Specific service
sudo docker compose -f docker-compose.mongodb.yml logs -f frontend
sudo docker compose -f docker-compose.mongodb.yml logs -f backend
sudo docker compose -f docker-compose.mongodb.yml logs -f mongodb
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

- [ ] Change default MongoDB password in `.env`
- [ ] Update JWT_SECRET to a strong random key
- [ ] Change default organizer password after first login
- [ ] Configure firewall to allow only LAN access (ports 3000, 8001, 27017)
- [ ] Set up SMTP credentials for email notifications

---

## 📱 Accessing from Other Devices

Other devices on your LAN can access:
- **Frontend:** `http://192.168.1.100:3000`
- **API:** `http://192.168.1.100:3000/api/`

**Find your server IP:**
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

---

## 🎯 What's Different from Development Setup?

| Aspect | Development | Docker Production |
|--------|-------------|-------------------|
| Frontend | Development server (port 3000) | Nginx (optimized, port 80 → mapped to 3000) |
| Backend | Direct FastAPI (port 8001) | Containerized with health checks |
| Database | Local MongoDB | Containerized MongoDB with persistence |
| Node Version | Depends on host | Isolated Node 20 environment |
| Build | Hot reload | Production optimized build |

---

## ✅ Success Indicators

1. ✅ `sudo docker compose ps` shows all services as "Up (healthy)"
2. ✅ Browser shows login page at `http://[YOUR-IP]:3000`
3. ✅ Can login with `organizer@hospital.com` / `password123`
4. ✅ Other LAN devices can access the application

---

## 📚 Additional Documentation

- Full deployment guide: `/app/DOCKER_DEPLOYMENT_GUIDE.md`
- MongoDB setup: `/app/database/MONGODB_SETUP_GUIDE.md`
- Gmail SMTP setup: `/app/GMAIL_SMTP_SETUP.md`
- Node version fix: `/app/DOCKER_BUILD_FIX.md`

---

**Deployment Time:** ~10-15 minutes (first time)  
**Maintenance:** Automatic restarts enabled  
**Data Persistence:** MongoDB data survives container restarts
