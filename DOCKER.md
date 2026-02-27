# 🐳 Docker Deployment Guide

Complete guide for deploying the Hospital Meeting Scheduler using Docker.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Starting Services](#starting-services)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)

## 🚀 Quick Start

### Linux/Mac
```bash
chmod +x start-docker.sh
./start-docker.sh
```

### Windows
```cmd
start-docker.bat
```

That's it! The application will be available at http://localhost:3000

## 📋 Prerequisites

1. **Docker Desktop** (or Docker Engine + Docker Compose)
   - Download: https://www.docker.com/products/docker-desktop
   - Minimum version: Docker 20.10+ and Docker Compose 2.0+

2. **Available Ports**
   - 3000 (Frontend)
   - 8001 (Backend API)
   - 27017 (MongoDB)

3. **System Requirements**
   - RAM: 4GB minimum, 8GB recommended
   - Disk Space: 2GB free space

## 🔧 Configuration

### Environment Files

The application uses three environment files:

#### 1. Root `.env` (Docker Compose variables)
```env
JWT_SECRET=your-secret-key-here
DB_NAME=hospital_meetings
FRONTEND_PORT=3000
BACKEND_PORT=8001
MONGODB_PORT=27017
```

#### 2. Backend `.env` (`backend/.env`)
```env
MONGO_URL=mongodb://mongodb:27017
DB_NAME=hospital_meetings
JWT_SECRET=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

#### 3. Frontend `.env` (`frontend/.env`)
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Creating Environment Files

```bash
# Copy example files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit with your values
nano .env  # or use your preferred editor
```

## 🎯 Starting Services

### Using Startup Scripts (Recommended)

**Linux/Mac:**
```bash
./start-docker.sh
```

**Windows:**
```cmd
start-docker.bat
```

### Manual Start

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Individual Service Control

```bash
# Start specific service
docker-compose up -d backend

# Restart service
docker-compose restart frontend

# View logs for specific service
docker-compose logs -f backend

# Stop specific service
docker-compose stop mongodb
```

## 📊 Monitoring

### Check Service Status

```bash
# View all running containers
docker-compose ps

# Check health status
curl http://localhost:8001/api/health
```

### View Logs

```bash
# All services (live tail)
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb

# Last 100 lines
docker-compose logs --tail=100 backend

# Since specific time
docker-compose logs --since 2024-01-01T10:00:00 backend
```

### Resource Usage

```bash
# View container resource usage
docker stats

# View disk usage
docker system df
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Port Already in Use

**Error:** `Bind for 0.0.0.0:3000 failed: port is already allocated`

**Solution:**
```bash
# Find process using port
lsof -i :3000  # Linux/Mac
netstat -ano | findstr :3000  # Windows

# Kill the process or change port in docker-compose.yml
```

#### 2. MongoDB Connection Failed

**Error:** `MongoNetworkError: connection refused`

**Solution:**
```bash
# Check MongoDB status
docker-compose ps mongodb

# View MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

#### 3. Backend Not Starting

**Solution:**
```bash
# View backend logs
docker-compose logs backend

# Rebuild backend
docker-compose up -d --build backend

# Check if dependencies are installed
docker-compose exec backend pip list
```

#### 4. Frontend Build Errors

**Solution:**
```bash
# Clear and rebuild
docker-compose down
docker-compose up -d --build frontend

# Check node_modules
docker-compose exec frontend ls -la node_modules
```

### Complete Reset

```bash
# Stop and remove all containers, networks, volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Clean Docker system
docker system prune -a --volumes

# Start fresh
./start-docker.sh
```

### Debug Mode

```bash
# Run container interactively
docker-compose run --rm backend /bin/bash

# Execute commands inside running container
docker-compose exec backend python --version
docker-compose exec frontend node --version
```

## 🔒 Production Deployment

### Security Checklist

- [ ] Change JWT_SECRET to a strong random value
- [ ] Use environment-specific .env files (never commit to git)
- [ ] Enable MongoDB authentication
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Limit CORS origins to your domain
- [ ] Set up log rotation
- [ ] Enable rate limiting

### Production docker-compose.yml

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
    volumes:
      - mongodb_data:/data/db
    networks:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    restart: always
    environment:
      - MONGO_URL=mongodb://${MONGO_ROOT_USER}:${MONGO_ROOT_PASSWORD}@mongodb:27017
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - mongodb
    networks:
      - backend
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    restart: always
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - backend

networks:
  backend:
    driver: bridge

volumes:
  mongodb_data:
```

### Environment Variables (Production)

```env
# Strong JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# MongoDB credentials
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=$(openssl rand -base64 24)

# Database name
DB_NAME=hospital_meetings_prod

# Backend URL (use your domain)
REACT_APP_BACKEND_URL=https://api.yourdomain.com
```

### Backup Strategy

```bash
# Backup MongoDB
docker-compose exec mongodb mongodump --out=/backup
docker cp hospital-mongodb:/backup ./backups/$(date +%Y%m%d)

# Backup uploads directory
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz backend/uploads/

# Automated backup script (crontab)
0 2 * * * /path/to/backup-script.sh
```

### Monitoring & Logging

```bash
# Set up log rotation
docker-compose logs --no-log-prefix > /var/log/hospital-app/app.log

# Use external monitoring (Prometheus, Grafana)
# Add monitoring services to docker-compose.yml
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MongoDB Docker Image](https://hub.docker.com/_/mongo)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)

## 🆘 Getting Help

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Verify configuration: Review all `.env` files
3. Check Docker status: `docker-compose ps`
4. Review health check: `curl http://localhost:8001/api/health`
5. Search existing issues or create a new one

---

**Last Updated:** February 2026
