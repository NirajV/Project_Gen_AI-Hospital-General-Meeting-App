# Docker Deployment Guide — BioMedMeet

> Step-by-step guide for deploying **BioMedMeet — Hospital Case Meeting
> Scheduler** with MongoDB using Docker Compose.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture overview](#architecture-overview)
3. [Quick start](#quick-start)
4. [Step-by-step setup](#step-by-step-setup)
5. [Configuration](#configuration)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)
8. [Production checklist](#production-checklist)
9. [Backup & restore](#backup--restore)

---

## Prerequisites

- **Docker** 20.10+ — <https://docs.docker.com/get-docker/>
- **Docker Compose** v2.x — bundled with Docker Desktop / Engine
- **Git** for cloning the repository

System requirements: 4 GB RAM (8 GB recommended), 5 GB free disk space,
Linux / macOS / Windows-WSL2.

```bash
docker --version
docker compose version
docker run hello-world
```

---

## Architecture overview

```
┌───────────────────────────────────────────────────────────┐
│                     Docker network                         │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Frontend   │  │   Backend    │  │   MongoDB    │    │
│  │  React+Nginx │  │  FastAPI     │  │     6.0      │    │
│  │              │  │              │  │              │    │
│  │  Port: 3000  │  │  Port: 8001  │  │  Port:27017  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│         ▲                  ▲                  ▲           │
│         └──────────────────┴──────────────────┘           │
└───────────────────────────────────────────────────────────┘
                          ▲
                          │
                User browser / Cloudflare Tunnel
                  https://biomedmeet.com
```

| Service  | Technology              | Internal port | Purpose            |
| -------- | ----------------------- | ------------- | ------------------ |
| Frontend | React 19 + Nginx        | 80 → 3000     | UI + `/api/*` proxy |
| Backend  | FastAPI + Python 3.11   | 8001          | REST API           |
| Database | MongoDB 6.0             | 27017         | Data storage       |

> Only the frontend port (3000) needs to be reachable from clients. Backend
> and Mongo are reached over the internal Docker network.

---

## Quick start

```bash
# 1. Clone
git clone <your-fork> biomedmeet
cd biomedmeet

# 2. Configure environment
cp .env.example .env
$EDITOR .env        # fill in MONGO_ROOT_PASSWORD, JWT_SECRET, SMTP_*, GRAPH_*

# 3. Build + start
sudo docker compose up -d --build

# 4. Watch it come up
sudo docker compose ps
sudo docker compose logs -f
```

Visit:

- Application:    `http://<host>:3000/`
- Marketing site: `http://<host>:3000/home/`
- Health check:   `http://<host>:3000/api/health`

---

## Step-by-step setup

### 1) Clone and enter the project

```bash
git clone <your-fork> biomedmeet
cd biomedmeet
```

### 2) Create the **root** `.env`

> ⚠️ docker-compose only substitutes `${VAR}` references from the root-level
> `.env` (the one next to `docker-compose.yml`). Putting secrets in
> `backend/.env` will NOT reach the backend container unless you also
> declare them in `docker-compose.yml`.

```bash
cp .env.example .env
$EDITOR .env
```

Minimum values to set:

```ini
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=<strong-password>
DB_NAME=hospital_meeting_scheduler

JWT_SECRET=<32+ random chars>
CORS_ORIGINS=https://biomedmeet.com,http://localhost:3000

EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@example.com
SMTP_PASSWORD=<gmail-app-password>
SMTP_FROM=you@example.com

# Optional — for Teams meeting links
GRAPH_CLIENT_ID=
GRAPH_TENANT_ID=
GRAPH_CLIENT_SECRET=
GRAPH_USER_ID=
```

### 3) Build the Docker images

```bash
sudo docker compose build
```

This takes ~5–10 minutes the first time.

### 4) Start the stack

```bash
sudo docker compose up -d
```

### 5) Wait for healthchecks

```bash
sudo docker compose ps
```

All three containers (`hospital_mongodb`, `hospital_backend`,
`hospital_frontend`) should report `Up (healthy)` within ~60 seconds.

### 6) Bootstrap the first user

The first user can register via the UI at `/register`, or you can pre-seed
one with `mongosh`:

```bash
sudo docker exec -it hospital_mongodb mongosh \
  -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin "$DB_NAME"
```

Then in the shell:

```js
db.users.insertOne({
  id: 'organizer-001',
  email: 'organizer@hospital.local',
  password: '<bcrypt-hash>',          // generate with backend/scripts or python -c "import bcrypt; print(bcrypt.hashpw(b'YourPass', bcrypt.gensalt()))"
  name: 'Hospital Organizer',
  role: 'organizer',
  is_active: true,
  must_change_password: true,
  created_at: new Date().toISOString()
});
```

---

## Configuration

All runtime configuration lives in the root `.env` file. See
[`.env.example`](../.env.example) for the full annotated list. Key groups:

| Group              | Variables                                                        |
| ------------------ | ---------------------------------------------------------------- |
| MongoDB            | `MONGO_ROOT_USER`, `MONGO_ROOT_PASSWORD`, `DB_NAME`              |
| JWT                | `JWT_SECRET`, `JWT_ALGORITHM`, `JWT_EXPIRATION_HOURS`            |
| CORS               | `CORS_ORIGINS`                                                   |
| Email              | `EMAIL_ENABLED`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_USE_TLS` |
| Scheduler          | `EMAIL_REMINDERS_ENABLED`, `REMINDER_POLL_SECONDS`               |
| Teams (Graph API)  | `GRAPH_CLIENT_ID`, `GRAPH_TENANT_ID`, `GRAPH_CLIENT_SECRET`, `GRAPH_USER_ID` |
| Ports              | `FRONTEND_PORT`, `BACKEND_PORT`                                  |

After any `.env` change:

```bash
sudo docker compose up -d
```

…or for a clean rebuild:

```bash
sudo docker compose up -d --build
```

---

## Verification

```bash
# All containers healthy?
sudo docker compose ps

# Backend healthcheck
curl http://localhost:3000/api/health
# → {"status":"ok",...}

# Mongo reachable from backend?
sudo docker exec hospital_backend python -c \
  "import os, asyncio; from motor.motor_asyncio import AsyncIOMotorClient;
   asyncio.run(AsyncIOMotorClient(os.environ['MONGO_URL']).admin.command('ping'))"
```

---

## Troubleshooting

### Backend keeps restarting

```bash
sudo docker compose logs backend --tail 100
```

Common causes:

- **MongoDB not ready** — wait, or recreate: `sudo docker compose up -d --force-recreate backend`
- **Bad `MONGO_URL`** — must reference the service name `mongodb`, not `localhost`
- **Missing env var** — check the root `.env` (not `backend/.env`)

### Frontend returns "Not authenticated" when downloading files

The frontend bundle baked into the image is stale (predates the secure
download fix). Rebuild:

```bash
sudo docker compose build frontend
sudo docker compose up -d frontend
```

### MongoDB unhealthy

```bash
sudo docker logs hospital_mongodb
```

If `mongosh` is missing in your Mongo image, swap the healthcheck in
`docker-compose.yml` to use `mongo --eval` instead.

### Port 27017 / 3000 already in use

```bash
# Stop any local MongoDB instance
sudo systemctl stop mongod
sudo systemctl disable mongod
# Or change FRONTEND_PORT in .env if 3000 is taken
```

---

## Production checklist

Before pointing real users at the stack:

- [ ] `MONGO_ROOT_PASSWORD` changed from the default
- [ ] `JWT_SECRET` is 32+ random characters
- [ ] `CORS_ORIGINS` matches your production domain only
- [ ] `EMAIL_ENABLED=true` with working SMTP credentials
- [ ] HTTPS terminated in front of the stack (Cloudflare Tunnel, Traefik,
      or an Nginx reverse-proxy with Let's Encrypt)
- [ ] Daily backup of the `hospital_mongodb_data` Docker volume
- [ ] `ENVIRONMENT=production`
- [ ] Audit `OWNER_EMAIL` so feedback submissions go to the right inbox

---

## Backup & restore

### Backup

```bash
sudo docker exec hospital_mongodb \
  mongodump \
    -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" \
    --authenticationDatabase admin \
    --db "$DB_NAME" \
    --archive=/tmp/biomedmeet.$(date +%F).archive
sudo docker cp hospital_mongodb:/tmp/biomedmeet.$(date +%F).archive ./backups/
```

### Restore

```bash
sudo docker cp ./backups/biomedmeet.YYYY-MM-DD.archive hospital_mongodb:/tmp/restore.archive
sudo docker exec hospital_mongodb \
  mongorestore \
    -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" \
    --authenticationDatabase admin \
    --archive=/tmp/restore.archive --drop
```

Uploaded files are stored in the `hospital_uploads_data` named volume — back
that up the same way you'd back up any Docker volume (e.g. tar the host path
under `/var/lib/docker/volumes/hospital_uploads_data/_data`).

---

*See also: [`SETUP.md`](../SETUP.md) for a friendlier first-time walkthrough,
and [`docs/TECHNICAL_RECREATION_PROMPT.md`](./TECHNICAL_RECREATION_PROMPT.md)
for the full architecture.*
