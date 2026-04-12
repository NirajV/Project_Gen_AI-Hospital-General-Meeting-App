# 🚀 Quick Deployment Reference Card

## One-Command Deployment

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/hospital-meeting-scheduler.git
cd hospital-meeting-scheduler

# Run automated deployment
./deploy.sh
```

That's it! The script will:
1. ✅ Check prerequisites
2. ✅ Detect server IP
3. ✅ Generate secure credentials
4. ✅ Create configuration files
5. ✅ Build Docker images
6. ✅ Start all services
7. ✅ Verify deployment

---

## Manual Deployment (Step-by-Step)

### 1. Prerequisites
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### 2. Clone & Configure
```bash
git clone YOUR_REPO_URL
cd hospital-meeting-scheduler
cp .env.docker.example .env
nano .env  # Update SERVER_IP and passwords
```

### 3. Deploy
```bash
docker compose -f docker-compose.mongodb.yml up -d --build
```

### 4. Access
```
http://YOUR_SERVER_IP:3000
```

---

## Common Commands

```bash
# Start
docker compose -f docker-compose.mongodb.yml up -d

# Stop
docker compose -f docker-compose.mongodb.yml down

# Restart
docker compose -f docker-compose.mongodb.yml restart

# Logs
docker compose -f docker-compose.mongodb.yml logs -f

# Status
docker compose -f docker-compose.mongodb.yml ps

# Update & Rebuild
git pull
docker compose -f docker-compose.mongodb.yml up -d --build
```

---

## Ports

| Service | Port | Access |
|---------|------|--------|
| Frontend | 3000 | http://SERVER_IP:3000 |
| Backend | 8001 | http://SERVER_IP:8001/api |
| MongoDB | 27017 | localhost:27017 |

---

## Files Structure

```
hospital-meeting-scheduler/
├── deploy.sh                      ← Automated deployment script
├── docker-compose.mongodb.yml     ← Docker orchestration (MongoDB)
├── docker-compose.yml             ← Docker orchestration (MySQL)
├── .env                           ← Configuration (create from example)
├── .env.docker.example            ← Example configuration
├── DOCKER_DEPLOYMENT_GUIDE.md     ← Full deployment guide
│
├── backend/
│   ├── Dockerfile                 ← Backend container config
│   ├── server.py                  ← FastAPI application
│   └── requirements.txt           ← Python dependencies
│
├── frontend/
│   ├── Dockerfile                 ← Frontend container config
│   ├── nginx.conf                 ← Nginx web server config
│   └── package.json               ← Node dependencies
│
└── database/
    ├── DDL_Mongo.js               ← MongoDB schema
    └── ddl.sql                    ← MySQL schema
```

---

## Troubleshooting

### Containers not starting?
```bash
docker compose -f docker-compose.mongodb.yml logs
sudo systemctl restart docker
```

### Port already in use?
```bash
sudo lsof -i :3000
sudo lsof -i :8001
# Kill process or change port in docker-compose
```

### Cannot access from LAN?
```bash
# Check firewall
sudo ufw allow 3000
sudo ufw allow 8001

# Verify SERVER_IP in .env matches your actual IP
ip addr show
```

### Database connection error?
```bash
# Check MongoDB
docker exec hospital_mongodb mongosh --eval "db.adminCommand('ping')"

# Verify credentials in .env
cat .env | grep MONGO
```

---

## Backup & Restore

### Backup
```bash
# Backup database
docker exec hospital_mongodb mongodump \
  --username admin \
  --password $(grep MONGO_ROOT_PASSWORD .env | cut -d'=' -f2) \
  --authenticationDatabase admin \
  --out /data/backup

# Copy to host
docker cp hospital_mongodb:/data/backup ./backup-$(date +%Y%m%d)
```

### Restore
```bash
# Copy backup to container
docker cp ./backup-20260410 hospital_mongodb:/data/restore

# Restore
docker exec hospital_mongodb mongorestore \
  --username admin \
  --password $(grep MONGO_ROOT_PASSWORD .env | cut -d'=' -f2) \
  --authenticationDatabase admin \
  /data/restore
```

---

## Security Checklist

Before production:
- [ ] Change MONGO_ROOT_PASSWORD
- [ ] Generate strong JWT_SECRET (48+ chars)
- [ ] Update SERVER_IP
- [ ] Configure SMTP for emails
- [ ] Set up firewall rules
- [ ] Enable HTTPS (optional)
- [ ] Backup .env file
- [ ] Set up automated backups

---

## Need Help?

**Full Guide:** `./DOCKER_DEPLOYMENT_GUIDE.md`
**MongoDB Setup:** `./database/MONGODB_SETUP_GUIDE.md`
**API Docs:** `./docs/API_REFERENCE.md`

**Check Status:**
```bash
docker compose -f docker-compose.mongodb.yml ps
curl http://localhost:8001/api/health
```

---

## Quick Test

```bash
# 1. Check services
docker ps

# 2. Test backend
curl http://localhost:8001/api/health

# 3. Test frontend
curl http://localhost:3000

# 4. Open in browser
# http://YOUR_SERVER_IP:3000
```

---

**Deployment Time:** ~10 minutes  
**Prerequisites:** Docker, Git, 4GB RAM, 10GB disk  
**Network:** LAN accessible  
**Database:** MongoDB 6.0  
**Backend:** FastAPI (Python)  
**Frontend:** React + Nginx
