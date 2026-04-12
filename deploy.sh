#!/bin/bash

# =================================================================
# Hospital Meeting Scheduler - Docker Deployment Script
# =================================================================
# This script automates the deployment process for LAN server
# =================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "$1"
    echo "=================================================="
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

check_command() {
    if command -v $1 &> /dev/null; then
        print_success "$1 is installed"
        return 0
    else
        print_error "$1 is NOT installed"
        return 1
    fi
}

# =================================================================
# STEP 1: Pre-flight checks
# =================================================================
print_header "STEP 1: Checking Prerequisites"

# Check Docker
if ! check_command docker; then
    print_error "Docker is not installed. Please install Docker first:"
    echo "  curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "  sudo sh get-docker.sh"
    exit 1
fi

# Check Docker Compose
if ! check_command "docker compose"; then
    print_error "Docker Compose is not installed or not in PATH"
    exit 1
fi

# Check Git
if ! check_command git; then
    print_warning "Git is not installed. If you need to clone from GitHub, install git first."
fi

print_success "All prerequisites met!"
echo ""

# =================================================================
# STEP 2: Get Server IP
# =================================================================
print_header "STEP 2: Server Configuration"

# Try to detect server IP
if command -v ip &> /dev/null; then
    DETECTED_IP=$(ip route get 1.1.1.1 | grep -oP 'src \K\S+' 2>/dev/null || echo "")
elif command -v ifconfig &> /dev/null; then
    DETECTED_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n1)
else
    DETECTED_IP=""
fi

if [ -n "$DETECTED_IP" ]; then
    echo "Detected server IP: $DETECTED_IP"
    read -p "Is this correct? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your server LAN IP address: " SERVER_IP
    else
        SERVER_IP=$DETECTED_IP
    fi
else
    read -p "Enter your server LAN IP address (e.g., 192.168.1.100): " SERVER_IP
fi

print_success "Server IP: $SERVER_IP"
echo ""

# =================================================================
# STEP 3: Generate secure passwords
# =================================================================
print_header "STEP 3: Generating Secure Credentials"

# Generate MongoDB password
MONGO_PASSWORD=$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-24)
print_success "MongoDB password generated"

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 48 | tr -d '=+/' | cut -c1-48)
print_success "JWT secret generated"

echo ""

# =================================================================
# STEP 4: Create .env file
# =================================================================
print_header "STEP 4: Creating Configuration File"

cat > .env << EOF
# ==============================================
# Hospital Meeting Scheduler - Configuration
# ==============================================
# Generated on: $(date)
# ==============================================

# SERVER CONFIGURATION
SERVER_IP=$SERVER_IP

# MONGODB CONFIGURATION
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=$MONGO_PASSWORD
DB_NAME=hospital_meeting_scheduler

# BACKEND CONFIGURATION
JWT_SECRET=$JWT_SECRET
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# CORS ORIGINS
CORS_ORIGINS=http://$SERVER_IP:3000,http://localhost:3000

# EMAIL CONFIGURATION (Optional - configure later)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EOF

print_success ".env file created"
echo ""

# =================================================================
# STEP 5: Create frontend environment
# =================================================================
print_header "STEP 5: Configuring Frontend"

if [ -d "frontend" ]; then
    cat > frontend/.env.production << EOF
REACT_APP_BACKEND_URL=http://$SERVER_IP:3000
EOF
    print_success "Frontend configuration created"
else
    print_warning "Frontend directory not found - skipping"
fi

echo ""

# =================================================================
# STEP 6: Pull latest changes (if git repo)
# =================================================================
print_header "STEP 6: Updating Repository"

if [ -d ".git" ]; then
    echo "Pulling latest changes from Git..."
    git pull origin main || git pull origin master || print_warning "Could not pull from git"
    print_success "Repository updated"
else
    print_warning "Not a git repository - skipping"
fi

echo ""

# =================================================================
# STEP 7: Build Docker images
# =================================================================
print_header "STEP 7: Building Docker Images"

echo "This may take 5-10 minutes on first build..."
docker compose -f docker-compose.mongodb.yml build

print_success "Docker images built successfully"
echo ""

# =================================================================
# STEP 8: Start containers
# =================================================================
print_header "STEP 8: Starting Application"

docker compose -f docker-compose.mongodb.yml up -d

print_success "Containers started"
echo ""

# Wait for services to be healthy
echo "Waiting for services to become healthy..."
sleep 10

# =================================================================
# STEP 9: Verify deployment
# =================================================================
print_header "STEP 9: Verifying Deployment"

# Check containers
echo "Checking container status..."
docker compose -f docker-compose.mongodb.yml ps

echo ""
echo "Checking service health..."

# Check MongoDB
if docker exec hospital_mongodb mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
    print_success "MongoDB is healthy"
else
    print_error "MongoDB is not responding"
fi

# Check Backend
if curl -s http://localhost:8001/api/health > /dev/null; then
    print_success "Backend is healthy"
else
    print_error "Backend is not responding"
fi

# Check Frontend
if curl -s http://localhost:3000 > /dev/null; then
    print_success "Frontend is healthy"
else
    print_error "Frontend is not responding"
fi

echo ""

# =================================================================
# DEPLOYMENT COMPLETE
# =================================================================
print_header "DEPLOYMENT COMPLETE!"

echo -e "${GREEN}"
cat << 'EOF'
  ██╗  ██╗ ██████╗ ███████╗██████╗ ██╗████████╗ █████╗ ██╗     
  ██║  ██║██╔═══██╗██╔════╝██╔══██╗██║╚══██╔══╝██╔══██╗██║     
  ███████║██║   ██║███████╗██████╔╝██║   ██║   ███████║██║     
  ██╔══██║██║   ██║╚════██║██╔═══╝ ██║   ██║   ██╔══██║██║     
  ██║  ██║╚██████╔╝███████║██║     ██║   ██║   ██║  ██║███████╗
  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝     ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝
                                                                  
   MEETING SCHEDULER - SUCCESSFULLY DEPLOYED!                    
EOF
echo -e "${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 Access your application at:"
echo ""
echo "   🌐 From this server:"
echo "      http://localhost:3000"
echo ""
echo "   🌐 From other devices on LAN:"
echo "      http://$SERVER_IP:3000"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Important Information:"
echo ""
echo "   MongoDB Password: $MONGO_PASSWORD"
echo "   JWT Secret: [Stored in .env file]"
echo ""
echo "   ⚠️  SAVE THESE CREDENTIALS SECURELY!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Next Steps:"
echo ""
echo "   1. Open browser: http://$SERVER_IP:3000"
echo "   2. Click 'Register' to create first user"
echo "   3. Login and start using the application!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔧 Useful Commands:"
echo ""
echo "   View logs:    docker compose -f docker-compose.mongodb.yml logs -f"
echo "   Stop app:     docker compose -f docker-compose.mongodb.yml down"
echo "   Start app:    docker compose -f docker-compose.mongodb.yml up -d"
echo "   Restart app:  docker compose -f docker-compose.mongodb.yml restart"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📖 Full Documentation: ./DOCKER_DEPLOYMENT_GUIDE.md"
echo ""
