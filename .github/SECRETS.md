# 🔐 GitHub Secrets Configuration

This document lists all required GitHub Secrets for the deployment workflow.

## Required Secrets

Add these secrets in your GitHub repository: **Settings > Secrets and variables > Actions > New repository secret**

### SSH Connection

| Secret Name | Description | Example |
|------------|-------------|---------|
| `SSH_PRIVATE_KEY` | Private SSH key for server access | Content of `~/.ssh/id_ed25519` |
| `SSH_HOST` | VPS server IP or domain | `192.168.1.100` or `example.com` |
| `SSH_USER` | SSH username | `deploy` or `root` |
| `SSH_PORT` | SSH port (optional, defaults to 22) | `22` |
| `DEPLOY_PATH` | Absolute path to project on server | `/var/www/mukit-py` |

### Application Configuration

| Secret Name | Description | Example |
|------------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql+asyncpg://user:pass@host:5432/db` |
| `REDIS_URL` | Redis connection URL | `redis://host:6379/0` |
| `SECRET_KEY` | JWT secret key | Generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | `https://example.com,https://www.example.com` |
| `VITE_API_URL` | Backend API URL for frontend | `https://api.example.com/api/v1` |
| `VITE_WS_URL` | WebSocket URL for frontend | `wss://api.example.com` |

## Quick Setup

1. **Generate SSH key pair** (if you don't have one):
   ```bash
   ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_key
   ```

2. **Add public key to server**:
   ```bash
   ssh-copy-id -i ~/.ssh/github_actions_key.pub user@your-server-ip
   ```

3. **Copy private key to GitHub**:
   ```bash
   cat ~/.ssh/github_actions_key
   # Copy the entire output and paste it as SSH_PRIVATE_KEY secret
   ```

4. **Add all other secrets** in GitHub repository settings.

## Security Notes

- Never commit secrets to the repository
- Rotate secrets regularly
- Use strong, unique values for SECRET_KEY
- Restrict SSH access with firewall rules
- Use SSH keys with passphrases for additional security







