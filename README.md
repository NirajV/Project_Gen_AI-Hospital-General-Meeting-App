# 🏥 Hospital General Meeting App

A full-stack web application for managing hospital general meetings with patient case discussions.

## ⚡ Quick Start

**For complete setup instructions, see:** [SETUP.md](./SETUP.md)

### Quick Deploy (3 Commands)

```bash
cd ~/hospital-meeting-app/Project_Gen_AI-Hospital-General-Meeting-App

# 1. Build images
sudo docker compose -f docker-compose.mongodb.yml build

# 2. Start services
sudo docker compose -f docker-compose.mongodb.yml up -d

# 3. Initialize database (see SETUP.md Step 7)
```

Access at: `http://YOUR-SERVER-IP:3000`

---

## 🎯 Features

- 👥 **User Management** - Organizers, participants with role-based access
- 📅 **Meeting Scheduler** - Create and manage meetings with multiple participants
- 🏥 **Patient Management** - Add patients with medical details, approval workflow
- 📄 **Document Management** - Upload medical reports and related documents
- 📧 **Email Notifications** - Automated meeting reminders (optional)
- 🔐 **Secure Authentication** - JWT-based auth with Google OAuth support

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TailwindCSS, Shadcn UI components
- **Backend:** Python FastAPI, Motor (async MongoDB driver)
- **Database:** MongoDB 6.0
- **Deployment:** Docker + Docker Compose + Nginx

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [SETUP.md](./SETUP.md) | **Complete setup guide** - Start here! |
| [GMAIL_SMTP_SETUP.md](./GMAIL_SMTP_SETUP.md) | Email notification configuration |
| [docs/API_REFERENCE.md](./docs/API_REFERENCE.md) | Backend API documentation |
| [docs/FEATURES.md](./docs/FEATURES.md) | Feature documentation |
| [docs/PATIENT_APPROVAL_SYSTEM.md](./docs/PATIENT_APPROVAL_SYSTEM.md) | Patient approval workflow |

---

## 🔑 Default Login

After setup, login with:
- **Email:** `organizer@hospital.com`
- **Password:** `password123`

**⚠️ Change password after first login!**

---

## 🏗️ Project Structure

```
/app
├── backend/           # FastAPI backend
│   ├── core/         # Config, database, auth modules
│   ├── models/       # Pydantic schemas
│   └── server.py     # Main API routes
├── frontend/         # React frontend
│   └── src/
│       ├── pages/    # Page components
│       └── components/ # Reusable UI components
├── database/         # MongoDB setup scripts
├── docs/             # Documentation
└── docker-compose.mongodb.yml  # Docker orchestration
```

---

## 🚀 Quick Commands

```bash
# Start services
sudo docker compose -f docker-compose.mongodb.yml up -d

# Stop services
sudo docker compose -f docker-compose.mongodb.yml down

# View logs
sudo docker compose -f docker-compose.mongodb.yml logs -f

# Restart services
sudo docker compose -f docker-compose.mongodb.yml restart

# Check status
sudo docker ps
```

---

## 🔍 Troubleshooting

See [SETUP.md](./SETUP.md) for detailed troubleshooting steps.

**Quick checks:**
```bash
# Check all containers are healthy
sudo docker ps

# View specific service logs
sudo docker logs hospital_mongodb
sudo docker logs hospital_backend
sudo docker logs hospital_frontend
```

---

## 🌐 Network Access

- **Port 3000:** Web interface (frontend + API)
- **Port 8001:** Backend API (internal only)
- **Port 27017:** MongoDB (internal only)

Only port 3000 needs to be accessible from your LAN.

---

## 📝 Environment Variables

Key variables in `.env`:
- `SERVER_IP` - Your LAN server IP address
- `MONGO_ROOT_PASSWORD` - MongoDB admin password
- `JWT_SECRET` - Secret for JWT token signing
- `SMTP_USER/SMTP_PASSWORD` - Email credentials (optional)

---

## 🔐 Security

- Change default passwords after first login
- Use strong JWT_SECRET (32+ characters)
- Configure firewall for LAN-only access
- Regular database backups recommended

---

## 📦 Data Persistence

Data is stored in Docker volumes:
- `hospital_mongodb_data` - Database
- `hospital_uploads_data` - File uploads

**Backup command:**
```bash
sudo docker exec hospital_mongodb mongodump --out=/tmp/backup
sudo docker cp hospital_mongodb:/tmp/backup ./mongodb_backup
```

---

## 🎓 Getting Started

1. Read [SETUP.md](./SETUP.md)
2. Follow the step-by-step instructions
3. Access the app at `http://YOUR-SERVER-IP:3000`
4. Login with default credentials
5. Create your first meeting!

---

## 📄 License

MIT License

---

**For complete setup instructions:** See [SETUP.md](./SETUP.md)
