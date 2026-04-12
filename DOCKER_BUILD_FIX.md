# 🔧 Docker Build Error Fix - yarn.lock Not Found

## Problem
```
ERROR [frontend 3/5] COPY package.json yarn.lock ./
"/yarn.lock": not found
```

---

## ✅ Solution (3 Options)

### Option 1: Generate yarn.lock (Recommended)

```bash
# Navigate to your project directory
cd ~/hospital-meeting-app/Project_Gen_AI-Hospital-General-Meeting-App

# Go to frontend directory
cd frontend

# Check if yarn.lock exists
ls -la | grep yarn

# If NOT exists, generate it:
yarn install

# This will create yarn.lock file
# Then go back to root
cd ..

# Now try building again
sudo docker compose -f docker-compose.mongodb.yml build
```

---

### Option 2: Update Dockerfile to Handle Missing yarn.lock

If you prefer to use npm instead of yarn:

**Update `/frontend/Dockerfile`:**

```dockerfile
# Hospital Meeting Scheduler - Frontend
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (using npm)
RUN npm ci

# Copy application code
COPY . .

# Build argument for backend URL
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

---

### Option 3: Use package-lock.json Instead

If you have `package-lock.json`:

**Update `/frontend/Dockerfile` line 8:**

```dockerfile
# Change from:
COPY package.json yarn.lock ./

# To:
COPY package*.json ./
```

Then update install command:
```dockerfile
# Change from:
RUN yarn install --frozen-lockfile

# To:
RUN npm ci
```

---

## 🔍 Quick Diagnosis

**Check what you have:**

```bash
cd ~/hospital-meeting-app/Project_Gen_AI-Hospital-General-Meeting-App/frontend

# Check which lock files exist
ls -la | grep -E "yarn.lock|package-lock.json"
```

**Expected output:**
- If you see `yarn.lock` → Use yarn (Option 1)
- If you see `package-lock.json` → Use npm (Option 3)
- If neither → Generate one (Option 1)

---

## 🚀 Step-by-Step Fix

### Step 1: Navigate to Project

```bash
cd ~/hospital-meeting-app/Project_Gen_AI-Hospital-General-Meeting-App
```

### Step 2: Check Frontend Dependencies

```bash
ls -la frontend/ | grep -E "lock|package"
```

### Step 3: Generate yarn.lock (if missing)

```bash
cd frontend
yarn install
cd ..
```

### Step 4: Build Docker Images

```bash
sudo docker compose -f docker-compose.mongodb.yml build
```

---

## 🔄 Alternative: Start Fresh

If still having issues:

```bash
cd ~/hospital-meeting-app/Project_Gen_AI-Hospital-General-Meeting-App

# Clean Docker build cache
sudo docker compose -f docker-compose.mongodb.yml down
sudo docker system prune -a

# Ensure frontend has dependencies installed
cd frontend
yarn install  # or: npm install
cd ..

# Build again
sudo docker compose -f docker-compose.mongodb.yml build --no-cache
```

---

## 📋 Complete Working Dockerfile (npm version)

Save this as `/frontend/Dockerfile`:

```dockerfile
# Hospital Meeting Scheduler - Frontend
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy application code
COPY . .

# Build argument for backend URL
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

---

## ✅ Verification

After fixing:

```bash
# Build should succeed
sudo docker compose -f docker-compose.mongodb.yml build

# You should see:
# [+] Building 245.7s (23/23) FINISHED
```

---

## 🎯 Summary

**Root Cause:** `yarn.lock` file missing or not accessible

**Quick Fix:**
```bash
cd ~/hospital-meeting-app/Project_Gen_AI-Hospital-General-Meeting-App/frontend
yarn install
cd ..
sudo docker compose -f docker-compose.mongodb.yml build
```

**If still failing:** Use npm-based Dockerfile above
