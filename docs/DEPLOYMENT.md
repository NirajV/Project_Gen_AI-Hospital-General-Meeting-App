# 🐳 Docker Deployment Guide - MySQL Version

> Complete step-by-step guide for deploying MedMeet Hospital Meeting Scheduler with **MySQL database** using Docker

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Quick Start](#quick-start)
4. [Step-by-Step Setup](#step-by-step-setup)
5. [Configuration](#configuration)
6. [Database Setup](#database-setup)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)
9. [Production Deployment](#production-deployment)

---

## 🎯 Prerequisites

### Required Software
- **Docker** 20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- **Docker Compose** 2.0+ (Included with Docker Desktop)
- **Git** (for cloning repository)

### System Requirements
- **RAM:** 4GB minimum (8GB recommended)
- **Disk Space:** 5GB free space
- **OS:** Linux, macOS, or Windows 10/11 with WSL2

### Verify Installation
```bash
# Check Docker version
docker --version
# Expected: Docker version 20.10.x or higher

# Check Docker Compose version
docker-compose --version
# Expected: Docker Compose version 2.x.x or higher

# Test Docker
docker run hello-world
```

---

## 🏗️ Architecture Overview

### Services Stack

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network                        │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Frontend   │  │   Backend    │  │    MySQL     │  │
│  │   (React)    │  │  (FastAPI)   │  │   Database   │  │
│  │              │  │              │  │              │  │
│  │  Port: 3000  │  │  Port: 8001  │  │  Port: 3306  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                  │                  │         │
│         └──────────────────┴──────────────────┘         │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │
                   User Browser
              http://localhost:3000
```

### Service Details

| Service | Technology | Port | Purpose |
|---------|-----------|------|---------|
| **Frontend** | React 18 + Tailwind | 3000 | User interface |
| **Backend** | FastAPI + Python 3.11 | 8001 | REST API server |
| **Database** | MySQL 8.0 | 3306 | Data storage |

---

## 🚀 Quick Start

### One-Command Deployment

```bash
# Clone repository
git clone https://github.com/yourusername/hospital-meeting-scheduler.git
cd hospital-meeting-scheduler

# Start all services
./start-docker.sh

# Wait 30-60 seconds for services to initialize
# Access application at: http://localhost:3000
```

**Default Login:**
- Email: `organizer@hospital.com`
- Password: `password123`

---

## 📖 Step-by-Step Setup

### Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/hospital-meeting-scheduler.git
cd hospital-meeting-scheduler

# Check current directory
pwd
# Should show: .../hospital-meeting-scheduler
```

### Step 2: Review Docker Configuration

**File: `docker-compose.yml`**

```yaml
version: '3.8'

services:
  # MySQL Database
  mysql:
    image: mysql:8.0
    container_name: hospital_mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-rootpassword}
      MYSQL_DATABASE: ${MYSQL_DATABASE:-hospital_meeting_scheduler}
      MYSQL_USER: ${MYSQL_USER:-hospital_user}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-hospital_pass}
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./database/ddl.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10
    networks:
      - hospital_network

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: hospital_backend
    restart: always
    environment:
      - DATABASE_TYPE=mysql
      - MYSQL_HOST=mysql
      - MYSQL_PORT=3306
      - MYSQL_DATABASE=${MYSQL_DATABASE:-hospital_meeting_scheduler}
      - MYSQL_USER=${MYSQL_USER:-hospital_user}
      - MYSQL_PASSWORD=${MYSQL_PASSWORD:-hospital_pass}
      - JWT_SECRET=${JWT_SECRET:-change-this-secret-in-production}
      - CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
      - EMAIL_ENABLED=${EMAIL_ENABLED:-false}
      - OWNER_EMAIL=${OWNER_EMAIL:-Niraj.K.Vishwakarma@gmail.com}
    ports:
      - "8001:8001"
    depends_on:
      mysql:
        condition: service_healthy
    volumes:
      - ./backend/uploads:/app/uploads
    networks:
      - hospital_network

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: hospital_frontend
    restart: always
    environment:
      - REACT_APP_BACKEND_URL=http://localhost:8001
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - hospital_network

volumes:
  mysql_data:
    driver: local

networks:
  hospital_network:
    driver: bridge
```

### Step 3: Configure Environment Variables

**Create `.env` file in root directory:**

```bash
# Create .env file
cat > .env << 'EOF'
# MySQL Database Configuration
MYSQL_ROOT_PASSWORD=rootpassword_change_in_production
MYSQL_DATABASE=hospital_meeting_scheduler
MYSQL_USER=hospital_user
MYSQL_PASSWORD=hospital_pass_change_in_production

# Backend Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Email Configuration (Optional)
EMAIL_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Application Owner
OWNER_EMAIL=Niraj.K.Vishwakarma@gmail.com
EOF
```

**Security Note:** Change all default passwords in production!

### Step 4: Start Services

```bash
# Start all services in detached mode
docker-compose up -d

# View logs (optional)
docker-compose logs -f
```

**Expected Output:**
```
Creating network "hospital_network"
Creating volume "mysql_data"
Creating hospital_mysql    ... done
Creating hospital_backend  ... done
Creating hospital_frontend ... done
```

### Step 5: Wait for Initialization

**Service Startup Timeline:**
1. **MySQL** (10-15 seconds) - Database initialization
2. **Backend** (20-30 seconds) - Waiting for DB + startup
3. **Frontend** (30-45 seconds) - Build and start

**Monitor startup progress:**
```bash
# Check service status
docker-compose ps

# Watch backend logs for "Application startup complete"
docker-compose logs -f backend

# Watch for: "INFO:     Application startup complete."
```

---

## ⚙️ Configuration

### Backend Environment Variables

**File: `backend/.env`** (Auto-configured by docker-compose)

```env
# Database Connection
DATABASE_TYPE=mysql
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_DATABASE=hospital_meeting_scheduler
MYSQL_USER=hospital_user
MYSQL_PASSWORD=hospital_pass

# JWT Authentication
JWT_SECRET=change-this-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=24

# CORS
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Email (Optional)
EMAIL_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Application
OWNER_EMAIL=Niraj.K.Vishwakarma@gmail.com
```

### Frontend Environment Variables

**File: `frontend/.env`**

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## 🗄️ Database Setup

### Automatic Schema Initialization

The MySQL schema is **automatically created** when the database container starts for the first time.

**File: `/app/database/ddl.sql`**
- Contains complete schema with all tables
- Creates indexes and foreign keys
- Inserts default test users
- Creates useful views

### Database Tables Created

1. **users** - User accounts (doctors, organizers, nurses, admins)
2. **patients** - Patient records and medical information
3. **meetings** - Hospital case meetings
4. **meeting_participants** - Meeting attendees (many-to-many)
5. **meeting_patients** - Patients in meetings (many-to-many)
6. **agenda_items** - Meeting agenda and treatment plans
7. **decision_logs** - Clinical decisions from meetings
8. **file_attachments** - Uploaded documents
9. **feedback** - User feedback submissions

### Default Test Users

| Email | Password | Role | Access Level |
|-------|----------|------|--------------|
| organizer@hospital.com | password123 | Organizer | Full access |
| doctor@hospital.com | password123 | Doctor | Standard access |

### Manual Database Access

**Connect to MySQL container:**
```bash
# Access MySQL shell
docker exec -it hospital_mysql mysql -u hospital_user -p
# Enter password: hospital_pass

# Show databases
SHOW DATABASES;

# Use hospital database
USE hospital_meeting_scheduler;

# Show tables
SHOW TABLES;

# View users
SELECT id, email, name, role FROM users;

# Exit
EXIT;
```

### Database Management

**Backup Database:**
```bash
# Export database to SQL file
docker exec hospital_mysql mysqldump \
  -u hospital_user -phospital_pass \
  hospital_meeting_scheduler > backup.sql

# Backup date: $(date +%Y%m%d)
docker exec hospital_mysql mysqldump \
  -u hospital_user -phospital_pass \
  hospital_meeting_scheduler > backup_$(date +%Y%m%d).sql
```

**Restore Database:**
```bash
# Restore from backup
docker exec -i hospital_mysql mysql \
  -u hospital_user -phospital_pass \
  hospital_meeting_scheduler < backup.sql
```

**Reset Database:**
```bash
# Stop services
docker-compose down

# Remove MySQL volume (⚠️ DELETES ALL DATA)
docker volume rm hospital-meeting-scheduler_mysql_data

# Restart services (fresh database)
docker-compose up -d
```

---

## ✅ Verification

### 1. Check Service Health

```bash
# View running containers
docker-compose ps

# Expected output:
# NAME                   STATUS          PORTS
# hospital_mysql         Up (healthy)    0.0.0.0:3306->3306/tcp
# hospital_backend       Up              0.0.0.0:8001->8001/tcp
# hospital_frontend      Up              0.0.0.0:3000->3000/tcp
```

### 2. Test Backend API

```bash
# Health check
curl http://localhost:8001/api/health

# Expected response:
# {"status":"healthy","database":"connected","timestamp":"2026-04-06T12:00:00Z"}

# API documentation
open http://localhost:8001/docs
# Or visit in browser for interactive Swagger UI
```

### 3. Test Frontend

```bash
# Open in browser
open http://localhost:3000

# Or use curl
curl http://localhost:3000
# Should return HTML
```

### 4. Test Database Connection

```bash
# Test MySQL connection
docker exec hospital_mysql mysql \
  -u hospital_user -phospital_pass \
  -e "SELECT COUNT(*) FROM hospital_meeting_scheduler.users;"

# Expected output: Count of users (should be 2 for default test users)
```

### 5. Test Login

1. Open: http://localhost:3000
2. Click "Sign In"
3. Enter:
   - Email: `organizer@hospital.com`
   - Password: `password123`
4. Should redirect to dashboard

---

## 🐛 Troubleshooting

### Issue: Services Not Starting

**Symptom:** `docker-compose ps` shows services as "Exit" or "Restarting"

**Solution:**
```bash
# Check logs for errors
docker-compose logs

# Check specific service
docker-compose logs backend
docker-compose logs mysql

# Restart services
docker-compose restart
```

### Issue: MySQL Connection Failed

**Symptom:** Backend logs show "Can't connect to MySQL server"

**Solution:**
```bash
# Check MySQL is running
docker-compose ps mysql

# Check MySQL logs
docker-compose logs mysql

# Verify MySQL is healthy
docker inspect hospital_mysql | grep -A 5 Health

# Wait longer (MySQL takes 10-15 seconds to start)
sleep 15 && docker-compose restart backend
```

### Issue: Port Already in Use

**Symptom:** `ERROR: port is already allocated`

**Solution:**
```bash
# Check what's using the port
lsof -i :3000  # Frontend
lsof -i :8001  # Backend
lsof -i :3306  # MySQL

# Kill the process or change ports in docker-compose.yml
# Example: Change "3000:3000" to "3001:3000"
```

### Issue: Frontend Shows "Cannot connect to backend"

**Symptom:** Frontend loads but API calls fail

**Solution:**
```bash
# Check backend is running
curl http://localhost:8001/api/health

# Check CORS configuration
docker-compose logs backend | grep CORS

# Verify frontend .env
docker exec hospital_frontend cat /app/.env | grep BACKEND_URL

# Should show: REACT_APP_BACKEND_URL=http://localhost:8001
```

### Issue: Database Schema Not Created

**Symptom:** Backend error: "Table 'users' doesn't exist"

**Solution:**
```bash
# Check if init script ran
docker-compose logs mysql | grep "init.sql"

# Manually run DDL
docker exec -i hospital_mysql mysql \
  -u hospital_user -phospital_pass \
  hospital_meeting_scheduler < database/ddl.sql

# Or reset database completely
docker-compose down -v
docker-compose up -d
```

### Issue: "Cannot login" or "Invalid credentials"

**Solution:**
```bash
# Verify default users exist
docker exec hospital_mysql mysql \
  -u hospital_user -phospital_pass \
  -e "SELECT email, role FROM hospital_meeting_scheduler.users;"

# If no users, re-run DDL
docker exec -i hospital_mysql mysql \
  -u hospital_user -phospital_pass \
  hospital_meeting_scheduler < database/ddl.sql
```

### Common Commands

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f mysql

# Restart specific service
docker-compose restart backend

# Restart all services
docker-compose restart

# Stop all services
docker-compose stop

# Start all services
docker-compose start

# Remove all containers (keeps volumes)
docker-compose down

# Remove all containers and volumes (⚠️ DELETES DATA)
docker-compose down -v

# Rebuild images (after code changes)
docker-compose build
docker-compose up -d
```

---

## 🚀 Production Deployment

### Security Checklist

- [ ] Change all default passwords
- [ ] Generate strong JWT_SECRET (32+ characters)
- [ ] Use secure MySQL passwords
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Enable MySQL authentication
- [ ] Restrict CORS_ORIGINS to production domain
- [ ] Review and limit database user permissions
- [ ] Enable MySQL audit logging
- [ ] Set up automated backups

### Production Environment Variables

```env
# Production Database
MYSQL_ROOT_PASSWORD=<strong-random-password>
MYSQL_DATABASE=hospital_meeting_scheduler
MYSQL_USER=hospital_prod_user
MYSQL_PASSWORD=<strong-random-password>

# Production JWT
JWT_SECRET=<generate-32-character-random-string>

# Production CORS
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Email (Enabled for production)
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@yourdomain.com
SMTP_PASSWORD=<gmail-app-password>

# Production Owner Email
OWNER_EMAIL=admin@yourdomain.com
```

### Production docker-compose.yml Additions

```yaml
services:
  mysql:
    # ... existing config ...
    command: 
      - --default-authentication-plugin=mysql_native_password
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
      - --max-connections=500
      - --innodb-buffer-pool-size=1G
    
  backend:
    # ... existing config ...
    environment:
      - DATABASE_TYPE=mysql
      - MYSQL_HOST=${MYSQL_HOST:-mysql}
      - ENVIRONMENT=production
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
  
  frontend:
    # ... existing config ...
    environment:
      - REACT_APP_BACKEND_URL=https://api.yourdomain.com
      - NODE_ENV=production
```

### SSL/HTTPS Setup

Add Nginx reverse proxy with Let's Encrypt SSL:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
```

### Monitoring

**Add health monitoring:**

```bash
# Install monitoring tools
docker run -d \
  --name=grafana \
  -p 3001:3000 \
  grafana/grafana

# Add Prometheus for metrics
docker run -d \
  --name=prometheus \
  -p 9090:9090 \
  prom/prometheus
```

### Automated Backups

**Create backup script:**

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/hospital_db_$DATE.sql"

# Create backup
docker exec hospital_mysql mysqldump \
  -u hospital_user -phospital_pass \
  hospital_meeting_scheduler > "$BACKUP_FILE"

# Compress
gzip "$BACKUP_FILE"

# Keep only last 7 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

**Add to crontab:**
```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup.sh
```

---

## 📊 Performance Optimization

### MySQL Tuning

```sql
-- Check current settings
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';
SHOW VARIABLES LIKE 'max_connections';

-- Optimize tables
OPTIMIZE TABLE users, patients, meetings;

-- Analyze tables for better query plans
ANALYZE TABLE users, patients, meetings;
```

### Docker Resource Limits

```yaml
services:
  mysql:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

---

## 📞 Support

### Getting Help

- **Documentation:** Check `/app/docs/` folder
- **API Docs:** http://localhost:8001/docs
- **Issues:** Check logs with `docker-compose logs`
- **Email:** Niraj.K.Vishwakarma@gmail.com

### Useful Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

---

**Deployment Guide Version:** 2.0.0 (MySQL)  
**Last Updated:** April 6, 2026  
**Database:** MySQL 8.0
