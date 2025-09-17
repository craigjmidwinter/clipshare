# Clipshare Docker Deployment Options

This repository provides multiple Docker deployment options for different use cases:

## Quick Start (Development/Testing)

Use the standard `docker-compose.yml` for development and testing:

```bash
git clone https://github.com/craigjmidwinter/clipshare.git
cd clipshare
mkdir -p data/{processed-files,temp,db,logs}
cp .env.docker .env
# Edit .env with your configuration
docker compose up -d
```

## Production Deployment

Use `docker-compose.production.yml` for production environments with PostgreSQL, Nginx, and Redis:

```bash
# Copy production compose file
cp docker-compose.production.yml docker-compose.override.yml

# Create production environment file
cp .env.docker .env
# Edit .env with production values

# Create required directories
sudo mkdir -p /var/lib/clipshare/{data,db,temp} /var/log/clipshare

# Start production stack
docker compose up -d
```

## Docker Image Tags

### For Production (Recommended)
- `ghcr.io/craigjmidwinter/clipshare:v0.3.2` - Specific version (most stable)
- `ghcr.io/craigjmidwinter/clipshare:0.3.2` - Version without 'v' prefix
- `ghcr.io/craigjmidwinter/clipshare:0.3` - Minor version updates

### For Development
- `ghcr.io/craigjmidwinter/clipshare:latest` - Latest build from main branch

## Volume Mappings

### Critical Volumes (Must be persistent)
- `/app/processed-files` - All video clips and workspace data
- `/app/prisma/db` - Database files (SQLite)

### Optional Volumes
- `/app/temp` - Temporary processing files
- `/app/logs` - Application logs

## Configuration Files

- `.env.docker` - Template environment file with all configuration options
- `docker-compose.yml` - Development/testing setup with SQLite
- `docker-compose.production.yml` - Production setup with PostgreSQL, Nginx, Redis

## Complete Documentation

- **[DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)** - Comprehensive deployment guide
- **[DOCKER_README.md](./DOCKER_README.md)** - Quick start guide
- **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Full deployment documentation

## Support

For issues with Docker deployment, please check:
1. Environment variables are properly configured
2. Required volumes are mapped correctly
3. Container logs for specific error messages

```bash
# Check container status
docker compose ps

# View logs
docker compose logs -f clipshare

# Check volume mounts
docker inspect clipshare-web | grep -A 10 "Mounts"
```