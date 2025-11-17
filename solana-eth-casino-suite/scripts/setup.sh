#!/bin/bash

# Solana-ETH Casino Suite - Setup Script
# This script sets up the complete development environment

set -e  # Exit on error

echo "================================================"
echo "Solana-ETH Casino Suite - Setup"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running in project directory
if [ ! -f "README.md" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm found: $(npm --version)${NC}"

# Check for Docker (optional)
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker found: $(docker --version)${NC}"
    DOCKER_AVAILABLE=true
else
    echo -e "${YELLOW}! Docker not found (optional)${NC}"
    DOCKER_AVAILABLE=false
fi

# Check for PHP (if not using Docker)
if ! $DOCKER_AVAILABLE; then
    if ! command -v php &> /dev/null; then
        echo -e "${RED}PHP is not installed. Please install PHP 8.3+ or use Docker.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ PHP found: $(php --version | head -n 1)${NC}"

    if ! command -v composer &> /dev/null; then
        echo -e "${RED}Composer is not installed. Please install Composer or use Docker.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Composer found${NC}"
fi

echo ""
echo -e "${YELLOW}Step 2: Setting up backend...${NC}"

# Copy .env file
if [ ! -f "backend-php/.env" ]; then
    cp backend-php/.env.example backend-php/.env
    echo -e "${GREEN}✓ Created backend-php/.env${NC}"

    # Generate random JWT secret
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1)
    if [ "$(uname)" == "Darwin" ]; then
        sed -i '' "s/your-secret-key-change-this-in-production-min-32-chars/$JWT_SECRET/" backend-php/.env
    else
        sed -i "s/your-secret-key-change-this-in-production-min-32-chars/$JWT_SECRET/" backend-php/.env
    fi
    echo -e "${GREEN}✓ Generated secure JWT_SECRET${NC}"
else
    echo -e "${YELLOW}! backend-php/.env already exists, skipping${NC}"
fi

# Install backend dependencies
if $DOCKER_AVAILABLE; then
    echo -e "${YELLOW}Skipping composer install (will run in Docker)${NC}"
else
    echo "Installing PHP dependencies..."
    cd backend-php
    composer install
    cd ..
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
fi

echo ""
echo -e "${YELLOW}Step 3: Setting up frontend...${NC}"

cd frontend

# Install frontend dependencies
echo "Installing npm dependencies..."
npm install

echo "Building frontend..."
npm run build

cd ..

echo -e "${GREEN}✓ Frontend built successfully${NC}"

echo ""
echo -e "${YELLOW}Step 4: Setting up infrastructure...${NC}"

# Create logs directory
mkdir -p backend-php/logs
mkdir -p backend-php/storage
echo -e "${GREEN}✓ Created logs and storage directories${NC}"

echo ""
if $DOCKER_AVAILABLE; then
    echo -e "${YELLOW}Step 5: Starting Docker containers...${NC}"

    docker-compose -f infra/docker-compose.yml up -d

    echo -e "${GREEN}✓ Docker containers started${NC}"

    echo "Waiting for services to be ready..."
    sleep 10

    echo "Running database seed script..."
    docker exec -it casino-backend php scripts/seed_demo_data.php

    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}Setup Complete!${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""
    echo -e "Access the application at: ${GREEN}http://localhost:8080${NC}"
    echo ""
    echo "Default admin credentials:"
    echo -e "  Email: ${YELLOW}admin@casino.local${NC}"
    echo -e "  Password: ${YELLOW}Admin123!@#${NC}"
    echo ""
    echo -e "${RED}⚠️  CHANGE THESE CREDENTIALS BEFORE DEPLOYING TO PRODUCTION${NC}"
    echo ""
    echo "To stop the services:"
    echo "  docker-compose -f infra/docker-compose.yml down"
    echo ""

else
    echo -e "${YELLOW}Step 5: Manual setup required${NC}"
    echo ""
    echo -e "${YELLOW}================================================${NC}"
    echo -e "${YELLOW}Setup Complete (Manual Steps Required)${NC}"
    echo -e "${YELLOW}================================================${NC}"
    echo ""
    echo "Next steps:"
    echo ""
    echo "1. Install and start MongoDB:"
    echo "   sudo systemctl start mongod"
    echo ""
    echo "2. Run database seed script:"
    echo "   php backend-php/scripts/seed_demo_data.php"
    echo ""
    echo "3. Configure Apache (see docs/quickstart.md)"
    echo "   Or run PHP built-in server for testing:"
    echo "   cd backend-php/public && php -S localhost:8080"
    echo ""
    echo "4. Access the application at: http://localhost:8080"
    echo ""
    echo "Default admin credentials:"
    echo -e "  Email: ${YELLOW}admin@casino.local${NC}"
    echo -e "  Password: ${YELLOW}Admin123!@#${NC}"
    echo ""
    echo -e "${RED}⚠️  CHANGE THESE CREDENTIALS IMMEDIATELY${NC}"
    echo ""
fi

echo "For more information, see:"
echo "  - docs/quickstart.md"
echo "  - docs/architecture.md"
echo "  - docs/security.md"
echo ""
echo -e "${YELLOW}⚠️  DEMO MODE ONLY - NOT FOR REAL-MONEY GAMBLING${NC}"
echo ""
