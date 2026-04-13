# 🚨 Quick Fix - Update Your Local backend/.env

**The build uses YOUR local files, not Emergent files!**

---

## 🔧 Fix in 3 Commands

```bash
cd ~/Project_Gen_AI-Hospital-General-Meeting-App

# 1. Update backend .env file
cat > backend/.env << 'EOF'
MONGO_URL=mongodb://admin:changeme123@mongodb:27017
DB_NAME=hospital_meeting_scheduler
JWT_SECRET=hospital_meeting_scheduler_secret_key_2025
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
UPLOAD_DIR=/app/uploads
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=niraj.k.vishwakarma@gmail.com
SMTP_PASSWORD=ynqv ocdz zauh iirc
SMTP_FROM=niraj.k.vishwakarma@gmail.com
SMTP_USE_TLS=true
OWNER_EMAIL=Niraj.K.Vishwakarma@gmail.com
EOF

# 2. Rebuild backend
sudo docker compose -f docker-compose.mongodb.yml build backend

# 3. Restart all services
sudo docker compose -f docker-compose.mongodb.yml up -d
```

**Wait 30 seconds, then check:**
```bash
sudo docker ps
```

---

## 🔍 If Still Failing

**Check backend logs:**
```bash
sudo docker logs hospital_backend --tail 50
```

**Common issues:**
- Connection errors → MongoDB not ready (wait longer)
- Import errors → Missing dependencies
- Port errors → Port 8001 in use

**Share the logs with me if still failing!**
