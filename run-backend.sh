#!/bin/bash
# Script to run the backend development server
# Usage: ./run-backend.sh

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Mukit Backend Server${NC}"
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}⚠️  Virtual environment not found. Creating one...${NC}"
    python3 -m venv venv
    echo -e "${GREEN}✅ Virtual environment created${NC}"
fi

# Activate virtual environment
echo -e "${BLUE}📦 Activating virtual environment...${NC}"
source venv/bin/activate

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo -e "${YELLOW}❌ Error: backend directory not found${NC}"
    exit 1
fi

# Install/update dependencies if needed
if [ ! -f "backend/.dependencies_installed" ] || [ "requirements.txt" -nt "backend/.dependencies_installed" ]; then
    echo -e "${BLUE}📦 Installing Python dependencies...${NC}"
    pip install -q --upgrade pip
    pip install -q -r backend/requirements.txt
    touch backend/.dependencies_installed
    echo -e "${GREEN}✅ Dependencies installed${NC}"
fi

# Change to backend directory
cd backend

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found in backend directory${NC}"
    echo -e "${YELLOW}   Using default configuration from env.example${NC}"
fi

echo ""
echo -e "${GREEN}✅ Backend server starting...${NC}"
echo -e "${BLUE}   Backend API: http://localhost:8888${NC}"
echo -e "${BLUE}   API Docs: http://localhost:8888/docs${NC}"
echo -e "${BLUE}   Health Check: http://localhost:8888/health${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

# Run the backend server
python run.py
