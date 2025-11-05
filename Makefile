# Mukit Project Makefile

.PHONY: help install dev build lint test clean setup-backend setup-frontend

# Default target
help:
	@echo "Available commands:"
	@echo "  install          - Install all dependencies"
	@echo "  dev              - Start development servers"
	@echo "  build            - Build production versions"
	@echo "  lint             - Run all linters"
	@echo "  lint-backend     - Run backend linters only"
	@echo "  lint-frontend    - Run frontend linters only"
	@echo "  test             - Run all tests"
	@echo "  clean            - Clean build artifacts"
	@echo "  setup-backend    - Setup backend environment"
	@echo "  setup-frontend   - Setup frontend environment"

# Install all dependencies
install: setup-backend setup-frontend

# Setup backend
setup-backend:
	@echo "Setting up backend..."
	cd backend && python -m venv ../venv
	cd backend && source ../venv/bin/activate && pip install -r requirements.txt
	cd backend && source ../venv/bin/activate && pip install ruff mypy bandit safety pre-commit

# Setup frontend
setup-frontend:
	@echo "Setting up frontend..."
	cd frontend && npm install

# Start development servers
dev:
	@echo "Starting development servers..."
	@echo "Backend: http://localhost:8888"
	@echo "Frontend: http://localhost:3333"
	@echo "Press Ctrl+C to stop all servers"
	@trap 'kill %1 %2' INT; \
	cd backend && source ../venv/bin/activate && python run.py & \
	cd frontend && npm run dev & \
	wait

# Build production versions
build:
	@echo "Building production versions..."
	cd backend && source ../venv/bin/activate && python -m py_compile main.py
	cd frontend && npm run build

# Run all linters
lint:
	@echo "Running all linters..."
	./lint.sh

# Run backend linters only
lint-backend:
	@echo "Running backend linters..."
	cd backend && source ../venv/bin/activate && ruff check . --fix
	cd backend && source ../venv/bin/activate && ruff format .
	cd backend && source ../venv/bin/activate && mypy app/
	cd backend && source ../venv/bin/activate && bandit -r app/

# Run frontend linters only
lint-frontend:
	@echo "Running frontend linters..."
	cd frontend && npm run lint:fix
	cd frontend && npm run format
	cd frontend && npm run type-check

# Run tests
test:
	@echo "Running all tests..."
	./test.sh all

# Run backend tests only
test-backend:
	@echo "Running backend tests..."
	./test.sh backend

# Run frontend tests only
test-frontend:
	@echo "Running frontend tests..."
	./test.sh frontend

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	./test.sh coverage

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf backend/__pycache__
	rm -rf backend/app/__pycache__
	rm -rf backend/app/*/__pycache__
	rm -rf frontend/dist
	rm -rf frontend/node_modules/.cache
	rm -f backend/bandit-report.json

# Database operations
db-upgrade:
	@echo "Upgrading database..."
	cd backend && source ../venv/bin/activate && alembic upgrade head

db-grant-privileges:
	@echo "Granting schema privileges (requires postgres superuser)..."
	@echo "Please run this command manually:"
	@echo "  psql -U postgres -d mukit -f backend/scripts/grant_schema_privileges.sql"
	@echo "Or run SQL commands:"
	@echo "  psql -U postgres -d mukit -c \"GRANT USAGE, CREATE ON SCHEMA public TO mukit;\""
	@echo "  psql -U postgres -d mukit -c \"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mukit;\""
	@echo "  psql -U postgres -d mukit -c \"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mukit;\""

db-downgrade:
	@echo "Downgrading database..."
	cd backend && source ../venv/bin/activate && alembic downgrade -1

db-revision:
	@echo "Creating new migration..."
	cd backend && source ../venv/bin/activate && alembic revision --autogenerate -m "$(message)"

# Docker operations
docker-build:
	@echo "Building Docker images..."
	docker-compose build

docker-up:
	@echo "Starting Docker containers..."
	docker-compose up -d

docker-down:
	@echo "Stopping Docker containers..."
	docker-compose down

docker-logs:
	@echo "Showing Docker logs..."
	docker-compose logs -f

