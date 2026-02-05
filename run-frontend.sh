#!/bin/bash
# Script to run the frontend development server
# Usage: ./run-frontend.sh

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Mukit Frontend Server${NC}"
echo ""

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo -e "${YELLOW}❌ Error: frontend directory not found${NC}"
    exit 1
fi

# Change to frontend directory
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found. Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
fi

# Check if .env file exists and warn if VITE_API_URL is not set
if [ ! -f ".env" ] || ! grep -q "VITE_API_URL" .env 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Warning: VITE_API_URL not set in frontend/.env${NC}"
    echo -e "${YELLOW}   Using default: http://localhost:8000/api/v1${NC}"
    echo -e "${YELLOW}   Create frontend/.env with: VITE_API_URL=http://localhost:8888/api/v1${NC}"
fi

echo ""
echo -e "${GREEN}✅ Frontend server starting...${NC}"
echo -e "${BLUE}   Frontend: http://localhost:3333${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

# Run the frontend development server
npm run dev
