# 🗄️ MongoDB Installation Guide for Hospital Meeting App

## 📋 MongoDB Installation Instructions

Your Hospital Meeting App uses **MongoDB** (not MySQL). Follow the instructions for your operating system below.

---

## 🪟 **Windows Installation**

### **Option A: MongoDB Community Edition (Recommended)**

#### **Step 1: Download MongoDB**
1. Go to: https://www.mongodb.com/try/download/community
2. Select:
   - **Version**: 7.0 or higher (Latest stable)
   - **Platform**: Windows
   - **Package**: MSI installer
3. Click **Download**

#### **Step 2: Install MongoDB**
1. Run the downloaded `.msi` file
2. Choose **Complete** installation
3. **IMPORTANT**: Check these options:
   - ✅ Install MongoDB as a Service
   - ✅ Run service as Network Service user
   - ✅ Install MongoDB Compass (GUI tool - optional but recommended)
4. Click **Next** → **Install**
5. Wait for installation to complete (2-5 minutes)

#### **Step 3: Verify Installation**
Open Command Prompt and run:
```cmd
mongosh --version
```

**✅ Expected output:**
```
2.x.x
```

If command not found, add MongoDB to PATH:
1. Search "Environment Variables" in Windows
2. Edit "Path" in System Variables
3. Add: `C:\Program Files\MongoDB\Server\7.0\bin`
4. Restart Command Prompt

#### **Step 4: Start MongoDB Service**
```cmd
net start MongoDB
```

**✅ Expected:** `The MongoDB service was started successfully.`

#### **Step 5: Connect to MongoDB**
```cmd
mongosh
```

**✅ You should see:**
```
Current Mongosh Log ID: ...
Connecting to: mongodb://127.0.0.1:27017/
test>
```

Type `exit` to quit.

---

### **Option B: MongoDB Atlas (Cloud - Free Tier)**

If you prefer not to install locally, use MongoDB's free cloud service:

1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Create free account
3. Create a free cluster (M0 Sandbox - FREE)
4. Get connection string
5. Update `/app/backend/.env`:
   ```env
   MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/hospital_meeting_db
   ```

---

## 🍎 **macOS Installation**

### **Using Homebrew (Recommended)**

#### **Step 1: Install Homebrew** (if not installed)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### **Step 2: Install MongoDB**
```bash
# Add MongoDB tap
brew tap mongodb/brew

# Install MongoDB Community Edition
brew install mongodb-community@7.0
```

#### **Step 3: Start MongoDB Service**
```bash
# Start MongoDB as a service
brew services start mongodb-community@7.0
```

**✅ Expected:** `Successfully started mongodb-community`

#### **Step 4: Verify Installation**
```bash
mongosh --version
```

#### **Step 5: Connect to MongoDB**
```bash
mongosh
```

**✅ You should see MongoDB shell prompt**

---

## 🐧 **Linux (Ubuntu/Debian) Installation**

### **Step 1: Import MongoDB GPG Key**
```bash
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
```

### **Step 2: Add MongoDB Repository**

**For Ubuntu 22.04:**
```bash
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
```

**For Ubuntu 20.04:**
```bash
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
```

### **Step 3: Install MongoDB**
```bash
sudo apt-get update
sudo apt-get install -y mongodb-org
```

### **Step 4: Start MongoDB**
```bash
# Start MongoDB service
sudo systemctl start mongod

# Enable MongoDB to start on boot
sudo systemctl enable mongod

# Check status
sudo systemctl status mongod
```

**✅ Expected:** `Active: active (running)`

### **Step 5: Verify Installation**
```bash
mongosh --version
mongosh
```

---

## ✅ **Verify MongoDB Installation**

Run these commands to ensure MongoDB is working:

### **1. Check MongoDB is Running**

**Windows:**
```cmd
net start | findstr MongoDB
```

**macOS/Linux:**
```bash
brew services list | grep mongodb   # macOS
sudo systemctl status mongod        # Linux
```

### **2. Connect to MongoDB**
```bash
mongosh
```

### **3. Test Basic Commands**
```javascript
// Show databases
show dbs

// Create test database
use test_db

// Insert test document
db.test_collection.insertOne({ name: "test", value: 123 })

// Find document
db.test_collection.find()

// Exit
exit
```

---

## 🔧 **Configure Your Hospital Meeting App**

### **Step 1: Check Backend Configuration**

Open `/app/backend/.env`:
```bash
# Windows
notepad C:\path\to\app\backend\.env

# macOS/Linux
nano /app/backend/.env
```

### **Step 2: Verify MongoDB Connection String**

Your `.env` should have:
```env
MONGO_URL=mongodb://localhost:27017/hospital_meeting_db
DB_NAME=hospital_meeting_db
```

**✅ This is correct for local MongoDB installation**

### **Step 3: Test Connection from App**

```bash
# Navigate to backend
cd /app/backend

# Test connection
python -c "from motor.motor_asyncio import AsyncIOMotorClient; client = AsyncIOMotorClient('mongodb://localhost:27017'); print('Connected!' if client.server_info() else 'Failed')"
```

**✅ Expected:** `Connected!`

---

## 🎯 **Quick Start After Installation**

### **Every Time You Work on the App:**

**1. Start MongoDB** (if not running):

**Windows:**
```cmd
net start MongoDB
```

**macOS:**
```bash
brew services start mongodb-community@7.0
```

**Linux:**
```bash
sudo systemctl start mongod
```

**2. Verify MongoDB is running:**
```bash
mongosh --eval "db.adminCommand('ping')"
```

**✅ Expected:** `{ ok: 1 }`

**3. Start your app** (backend and frontend as usual)

---

## 🛠️ **MongoDB Tools**

### **1. MongoDB Shell (mongosh)**
Command-line interface to interact with MongoDB
```bash
mongosh mongodb://localhost:27017/hospital_meeting_db
```

### **2. MongoDB Compass (GUI)**
Visual tool to explore and manage MongoDB
- Download: https://www.mongodb.com/try/download/compass
- Connection String: `mongodb://localhost:27017`

### **3. VS Code Extension**
Install "MongoDB for VS Code" extension:
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search "MongoDB for VS Code"
4. Install
5. Connect using: `mongodb://localhost:27017`

---

## 🚨 **Common Issues & Solutions**

### **Issue 1: "mongosh: command not found"**

**Solution:**
Add MongoDB to your system PATH

**Windows:**
1. Search "Environment Variables"
2. Edit "Path"
3. Add: `C:\Program Files\MongoDB\Server\7.0\bin`
4. Restart terminal

**macOS/Linux:**
```bash
# Add to ~/.bashrc or ~/.zshrc
export PATH="/usr/local/opt/mongodb-community@7.0/bin:$PATH"
source ~/.bashrc  # or source ~/.zshrc
```

---

### **Issue 2: "Connection refused" or "ECONNREFUSED"**

**Solution:**
MongoDB service is not running

**Windows:**
```cmd
net start MongoDB
```

**macOS:**
```bash
brew services start mongodb-community@7.0
```

**Linux:**
```bash
sudo systemctl start mongod
```

---

### **Issue 3: "Data directory not found"**

**Solution:**
Create MongoDB data directory

**Windows:**
```cmd
mkdir C:\data\db
```

**macOS/Linux:**
```bash
sudo mkdir -p /data/db
sudo chown -R $(whoami) /data/db
```

---

### **Issue 4: Port 27017 already in use**

**Solution:**
Another process is using MongoDB's port

**Find the process:**
```bash
# Windows
netstat -ano | findstr :27017

# macOS/Linux
lsof -i :27017
```

**Kill it:**
```bash
# Windows
taskkill /PID <PID> /F

# macOS/Linux
kill -9 <PID>
```

---

## 📊 **MongoDB vs MySQL**

Your app **previously used MySQL** but **now uses MongoDB**. Here are the differences:

| Feature | MySQL | MongoDB |
|---------|-------|---------|
| Type | SQL (Relational) | NoSQL (Document) |
| Data Structure | Tables with rows | Collections with documents |
| Schema | Fixed schema | Flexible schema |
| Query Language | SQL | MongoDB Query Language |
| Relationships | Foreign keys | Embedded or referenced |

**Your app now stores data as JSON-like documents instead of SQL tables.**

---

## 🔐 **Security (For Production)**

### **Enable Authentication:**

```bash
mongosh
```

```javascript
// Switch to admin database
use admin

// Create admin user
db.createUser({
  user: "admin",
  pwd: "secure_password_here",
  roles: [ { role: "root", db: "admin" } ]
})

// Create app user
use hospital_meeting_db
db.createUser({
  user: "hospital_app",
  pwd: "another_secure_password",
  roles: [ { role: "readWrite", db: "hospital_meeting_db" } ]
})

exit
```

### **Update .env file:**
```env
MONGO_URL=mongodb://hospital_app:another_secure_password@localhost:27017/hospital_meeting_db?authSource=hospital_meeting_db
```

**⚠️ Only do this for production deployments!**

---

## 📖 **Additional Resources**

- **Official Docs**: https://www.mongodb.com/docs/manual/installation/
- **MongoDB University** (Free courses): https://university.mongodb.com/
- **MongoDB Compass** (GUI): https://www.mongodb.com/try/download/compass
- **MongoDB Shell Docs**: https://www.mongodb.com/docs/mongodb-shell/

---

## ✅ **Installation Complete Checklist**

- [ ] MongoDB installed and version verified (`mongosh --version`)
- [ ] MongoDB service running (`net start MongoDB` or equivalent)
- [ ] Can connect to MongoDB shell (`mongosh`)
- [ ] Backend `.env` has correct `MONGO_URL`
- [ ] Can test connection from Python
- [ ] MongoDB Compass installed (optional but recommended)
- [ ] Hospital Meeting App backend starts without errors

---

**Last Updated**: March 1, 2026  
**MongoDB Version**: 7.0+  
**Tested On**: Windows 10/11, macOS 13+, Ubuntu 20.04/22.04

---

🎉 **MongoDB is now ready for your Hospital Meeting App!** 🎉

**Next Steps:**
1. Start MongoDB service
2. Start backend: `cd /app/backend && python -m uvicorn server:app --reload --host 0.0.0.0 --port 8001`
3. Start frontend: `cd /app/frontend && npm start`
4. Access app: http://localhost:3000
