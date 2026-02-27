#!/bin/bash

# Hospital Meeting Scheduler - Docker Startup Script
# This script starts the entire application stack using Docker Compose

set -e

echo "🏥 Hospital Meeting Scheduler - Docker Setup"
echo "============================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please review and update if needed."
fi

# Create backend .env if it doesn't exist
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend/.env file from template..."
    cp backend/.env.example backend/.env
    echo "✅ backend/.env file created."
fi

# Create frontend .env if it doesn't exist
if [ ! -f frontend/.env ]; then
    echo "📝 Creating frontend/.env file from template..."
    cp frontend/.env.example frontend/.env
    echo "✅ frontend/.env file created."
fi

# Create uploads directory
mkdir -p backend/uploads
echo "✅ Uploads directory ready."

echo ""
echo "🐳 Starting Docker containers..."
echo ""

# Build and start containers
docker-compose up -d --build

echo ""
echo "⏳ Waiting for services to be ready..."
echo ""

# Wait for backend to be healthy
echo "Checking backend health..."
for i in {1..30}; do
    if curl -s http://localhost:8001/api/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    echo -n "."
    sleep 2
done

echo ""
echo "Checking frontend..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Frontend is ready!"
        break
    fi
    echo -n "."
    sleep 2
done

echo ""
echo "============================================"
echo "✅ Hospital Meeting Scheduler is running!"
echo "============================================"
echo ""
echo "📱 Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8001"
echo "   API Docs: http://localhost:8001/docs"
echo ""
echo "🔐 Test Credentials:"
echo "   Email: organizer@hospital.com"
echo "   Password: password123"
echo ""
echo "📊 View logs:"
echo "   All services: docker-compose logs -f"
echo "   Backend only: docker-compose logs -f backend"
echo "   Frontend only: docker-compose logs -f frontend"
echo ""
echo "🛑 Stop services:"
echo "   docker-compose down"
echo ""
echo "🗑️  Clean reset (removes data):"
echo "   docker-compose down -v"
echo ""
