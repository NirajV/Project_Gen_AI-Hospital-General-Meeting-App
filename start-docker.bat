@echo off
REM Hospital Meeting Scheduler - Docker Startup Script for Windows
REM This script starts the entire application stack using Docker Compose

echo ============================================
echo Hospital Meeting Scheduler - Docker Setup
echo ============================================
echo.

REM Check if Docker is running
docker version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Check if Docker Compose is available
docker-compose version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is not installed. Please install Docker Desktop.
    pause
    exit /b 1
)

REM Create .env files if they don't exist
if not exist ".env" (
    echo Creating .env file from template...
    copy .env.example .env
    echo .env file created.
)

if not exist "backend\.env" (
    echo Creating backend\.env file from template...
    copy backend\.env.example backend\.env
    echo backend\.env file created.
)

if not exist "frontend\.env" (
    echo Creating frontend\.env file from template...
    copy frontend\.env.example frontend\.env
    echo frontend\.env file created.
)

REM Create uploads directory
if not exist "backend\uploads" mkdir backend\uploads
echo Uploads directory ready.

echo.
echo Starting Docker containers...
echo.

REM Build and start containers
docker-compose up -d --build

echo.
echo Waiting for services to be ready...
echo.

REM Wait a bit for services to start
timeout /t 10 /nobreak >nul

echo.
echo ============================================
echo Hospital Meeting Scheduler is running!
echo ============================================
echo.
echo Access the application:
echo    Frontend: http://localhost:3000
echo    Backend API: http://localhost:8001
echo    API Docs: http://localhost:8001/docs
echo.
echo Test Credentials:
echo    Email: organizer@hospital.com
echo    Password: password123
echo.
echo View logs:
echo    All services: docker-compose logs -f
echo    Backend only: docker-compose logs -f backend
echo    Frontend only: docker-compose logs -f frontend
echo.
echo Stop services:
echo    docker-compose down
echo.
echo Clean reset (removes data):
echo    docker-compose down -v
echo.
pause
