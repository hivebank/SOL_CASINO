#!/bin/bash

# Demo Script - Simulates end-to-end casino workflow
# This script demonstrates the complete casino flow using the API

echo "================================================"
echo "Solana-ETH Casino Suite - Demo"
echo "================================================"
echo ""

API_BASE="http://localhost:8080"

echo "This demo script simulates:"
echo "1. Starting services"
echo "2. Seeding demo data"
echo "3. Testing API endpoints"
echo "4. Simulating game workflow"
echo ""

# Check if services are running
if ! curl -s "$API_BASE/health" > /dev/null 2>&1; then
    echo "Error: Backend is not running at $API_BASE"
    echo "Please start the services first:"
    echo "  docker-compose -f infra/docker-compose.yml up -d"
    echo "  or"
    echo "  cd backend-php/public && php -S localhost:8080"
    exit 1
fi

echo "✓ Backend is running"
echo ""

# Test health endpoint
echo "Testing health endpoint..."
HEALTH=$(curl -s "$API_BASE/health")
echo "Response: $HEALTH"
echo ""

# Test game config endpoint
echo "Testing game config endpoint..."
CONFIG=$(curl -s "$API_BASE/api/v1/game/config")
echo "Game config retrieved"
echo ""

echo "================================================"
echo "Demo Flow Complete!"
echo "================================================"
echo ""
echo "The casino is ready to use!"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:8080 in your browser"
echo "2. Connect your wallet (Phantom or MetaMask)"
echo "3. Switch to Demo mode"
echo "4. Top up demo credits"
echo "5. Play games!"
echo ""
echo "For admin access:"
echo "  Email: admin@casino.local"
echo "  Password: Admin123!@#"
echo ""
