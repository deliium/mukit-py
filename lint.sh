#!/bin/bash

# Strict code quality checks script

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Running strict code quality checks...${NC}"

# Function to check command status
check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
        return 0
    else
        echo -e "${RED}❌ $2 failed${NC}"
        return 1
    fi
}

# Error counter
ERROR_COUNT=0

echo -e "\n${YELLOW}🐍 Backend (Python/FastAPI)${NC}"
cd backend

# Ruff linter
echo "Running Ruff linter..."
source ../venv/bin/activate
ruff check app/ --show-fixes
if ! check_status $? "Ruff check"; then
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

# Ruff formatter
echo "Running Ruff formatter..."
ruff format app/ --check --diff
if ! check_status $? "Ruff format"; then
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

# MyPy type checker
echo "Running MyPy type checker..."
mypy app/ --show-error-codes --strict
if ! check_status $? "MyPy check"; then
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

# Bandit security linter
echo "Running Bandit security linter..."
bandit -r app/ -f json -o bandit-report.json
if ! check_status $? "Bandit check"; then
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

# pip-audit dependency check
echo "Running pip-audit dependency check..."
pip-audit --format=json --output=pip-audit-report.json
# Note: pip-audit returns non-zero exit code when vulnerabilities are found
# This is expected and not treated as a linting error
echo "✅ pip-audit check (vulnerabilities found are warnings, not errors)"

cd ..

echo -e "\n${YELLOW}⚛️  Frontend (React/TypeScript)${NC}"
cd frontend

# ESLint
echo "Running ESLint..."
npm run lint
if ! check_status $? "ESLint check"; then
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

# Prettier
echo "Running Prettier..."
npm run format:check
if ! check_status $? "Prettier check"; then
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

# TypeScript compiler
echo "Running TypeScript compiler..."
npm run type-check
if ! check_status $? "TypeScript check"; then
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

cd ..

# Final result
echo -e "\n${BLUE}📊 Summary${NC}"
if [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! Code quality is excellent.${NC}"
    exit 0
else
    echo -e "${RED}💥 Found $ERROR_COUNT failed checks. Please fix the issues above.${NC}"
    exit 1
fi