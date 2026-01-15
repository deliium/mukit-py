# 🚀 Deployment Guide

This document describes how to set up GitHub Actions for automatic deployment to a VPS server.

## 📋 Prerequisites

1. A VPS server with:
   - Python 3.12+ installed
   - Node.js 18+ and npm installed
   - PostgreSQL 12+ installed and running
   - Nginx (optional, for serving frontend)
   - Git installed
   - SSH access configured
   - Systemd (for service management)
   - Sufficient resources to run the application

2. GitHub repository with Actions enabled

## 🔐 Required GitHub Secrets

Configure the following secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

### SSH Connection Secrets

- **`SSH_PRIVATE_KEY`**: Private SSH key for connecting to the VPS server
  ```bash
  # Generate a new SSH key pair if needed
  ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_key
  # Add the public key to your VPS server's ~/.ssh/authorized_keys
  # Copy the private key content to GitHub Secrets
  cat ~/.ssh/github_actions_key
  ```

- **`SSH_HOST`**: IP address or domain name of your VPS server
  - Example: `192.168.1.100` or `example.com`

- **`SSH_USER`**: SSH username for connecting to the server
  - Example: `deploy` or `root`

- **`SSH_PORT`**: SSH port (optional, defaults to 22)
  - Example: `22` or `2222`

- **`DEPLOY_PATH`**: Absolute path on the server where the project is located
  - Example: `/var/www/mukit-py` or `/home/deploy/mukit-py`

### Application Secrets

- **`DATABASE_URL`**: PostgreSQL database connection URL
  - Format: `postgresql+asyncpg://user:password@host:port/database`
  - Example: `postgresql+asyncpg://mukit_user:mukit_password@db:5432/mukit_db`

- **`REDIS_URL`**: Redis connection URL (optional if not using Redis)
  - Format: `redis://host:port/db`
  - Example: `redis://redis:6379/0`

- **`SECRET_KEY`**: Secret key for JWT tokens and session encryption
  - Generate a secure random string:
  ```bash
  python -c "import secrets; print(secrets.token_urlsafe(32))"
  ```

- **`ALLOWED_ORIGINS`**: Comma-separated list of allowed CORS origins
  - Example: `https://example.com,https://www.example.com`

- **`VITE_API_URL`**: Backend API URL for frontend
  - Example: `https://api.example.com/api/v1`

- **`VITE_WS_URL`**: WebSocket URL for frontend
  - Example: `wss://api.example.com`

## 🏗️ Server Setup

### 1. Initial Server Configuration

```bash
# Connect to your VPS server
ssh user@your-server-ip

# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Install Python 3.12 and pip
sudo apt-get install -y python3.12 python3.12-venv python3-pip python3.12-dev

# Install Node.js 18+ (using NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Install Nginx (for serving frontend)
sudo apt-get install -y nginx

# Install Git and other utilities
sudo apt-get install -y git build-essential

# Create deployment directory
sudo mkdir -p /var/www/mukit-py
sudo chown $USER:$USER /var/www/mukit-py
cd /var/www/mukit-py

# Clone your repository
git clone https://github.com/your-username/mukit-py.git .

# Create necessary directories
mkdir -p backend/uploads
```

### 2. Configure SSH Key for GitHub Actions

```bash
# On your local machine, generate SSH key pair
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_key

# Copy public key to server
ssh-copy-id -i ~/.ssh/github_actions_key.pub user@your-server-ip

# Or manually add to server's authorized_keys
cat ~/.ssh/github_actions_key.pub | ssh user@your-server-ip "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"

# Copy private key content to GitHub Secrets
cat ~/.ssh/github_actions_key
```

### 3. Configure Database

If you're using an external database, make sure it's accessible from your VPS server. If using Docker Compose, the database will be created automatically.

For production, consider using a managed database service or a separate database server.

## 🔄 Deployment Process

The GitHub Action workflow (`deploy.yml`) performs the following steps:

1. **Lint and Test**:
   - Installs Python and Node.js dependencies
   - Runs backend linters (Ruff, MyPy, Bandit)
   - Runs frontend linters (ESLint, Prettier, TypeScript)
   - Runs backend tests (pytest)
   - Runs frontend tests (vitest)

2. **Deploy** (only if lint and tests pass):
   - Builds frontend production bundle locally in GitHub Actions
   - Connects to VPS via SSH
   - Pulls latest code from repository
   - Creates/updates `.env` files in `backend/` directory
   - Sets up Python virtual environment and installs dependencies
   - Runs database migrations using Alembic
   - Deploys frontend production build (static files) to server
   - Restarts backend systemd service
   - Reloads nginx to serve new static files
   - Performs health check

## 🚨 Troubleshooting

### Deployment fails with SSH connection error

- Verify SSH key is correctly added to GitHub Secrets
- Check that the public key is in server's `~/.ssh/authorized_keys`
- Verify SSH_HOST, SSH_USER, and SSH_PORT are correct
- Test SSH connection manually:
  ```bash
  ssh -i ~/.ssh/github_actions_key -p 22 user@your-server-ip
  ```

### Python virtual environment issues

- Check Python version: `python3 --version` (should be 3.12+)
- Verify venv is created: `ls -la /var/www/mukit-py/venv`
- Check pip installation: `source venv/bin/activate && pip list`

### Database migration fails

- Verify DATABASE_URL is correct in `backend/.env`
- Check database server is accessible: `psql -h localhost -U mukit_user -d mukit_db`
- Ensure database user has necessary privileges
- Review migration logs: `cd backend && source ../venv/bin/activate && alembic upgrade head`

### Frontend build fails

- Check Node.js version: `node --version` (should be 18+)
- Verify npm dependencies: `cd frontend && npm ci`
- Check build output: `cd frontend && npm run build`

### Backend service doesn't start

- Check service status: `sudo systemctl status mukit-backend`
- View service logs: `sudo journalctl -u mukit-backend -f`
- Verify service file paths are correct
- Check port 8888 is not in use: `sudo lsof -i :8888`

### Nginx issues

- Test nginx configuration: `sudo nginx -t`
- Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`
- Verify frontend build exists: `ls -la /var/www/mukit-py/frontend/dist`
- Check nginx has read permissions on dist directory

## 📝 Manual Deployment

If you need to deploy manually:

```bash
# Connect to server
ssh user@your-server-ip
cd /var/www/mukit-py

# Pull latest changes
git pull origin main

# Update backend
source venv/bin/activate
pip install -r backend/requirements.txt
cd backend
alembic upgrade head
cd ..

# Update frontend
cd frontend
npm ci
npm run build
cd ..

# Restart services
sudo systemctl restart mukit-backend
sudo systemctl reload nginx

# Check status
sudo systemctl status mukit-backend
```

## 🔒 Security Best Practices

1. **Never commit secrets**: All sensitive data should be in GitHub Secrets
2. **Use strong SSH keys**: Use ed25519 keys with passphrase
3. **Limit SSH access**: Use firewall rules to restrict SSH access
4. **Regular updates**: Keep Docker, system packages, and dependencies updated
5. **Monitor logs**: Regularly check application and system logs
6. **Backup database**: Set up regular database backups
7. **Use HTTPS**: Configure reverse proxy (nginx/traefik) with SSL certificates

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)




