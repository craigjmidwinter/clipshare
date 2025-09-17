# Docker Deployment Setup

This repository includes automated Docker image building and publishing to GitHub Container Registry (GHCR) on pushes to the main branch.

## Quick Start with Docker Compose

The easiest way to run Clipshare is using the provided `docker-compose.yml`:

```bash
# Clone the repository
git clone https://github.com/craigjmidwinter/clipshare.git
cd clipshare

# Create data directories for persistence
mkdir -p data/{processed-files,temp,db,logs}

# Set proper permissions for the data directories
sudo chown -R 1001:1001 data/

# Copy and edit the environment variables
cp web/env.example .env
# Edit .env with your configuration

# Start the application
docker-compose up -d

# Check the logs
docker-compose logs -f clipshare
```

### For Production Deployment

Use the production-optimized compose file:

```bash
# Use production compose file with PostgreSQL, Nginx, and Redis
cp docker-compose.production.yml docker-compose.yml

# Create environment file with production settings
cat > .env << EOF
NEXTAUTH_SECRET=your-super-secret-key-at-least-32-characters-long
NEXTAUTH_URL=https://clipshare.yourdomain.com
PLEX_CLIENT_ID=your-plex-client-id
PLEX_SERVER_URL=http://your-plex-server:32400
PLEX_SERVER_TOKEN=your-plex-server-token
POSTGRES_PASSWORD=secure-database-password
EOF

# Create required directories
sudo mkdir -p /var/lib/clipshare/{data,db,temp} /var/log/clipshare

# Start production stack
docker-compose up -d
```

## Volume Mappings for Persistence

Clipshare requires several directories to be mapped for proper data persistence:

### Critical Volumes (Data Loss Risk if Not Mapped)

| Host Path | Container Path | Purpose | Size Estimate |
|-----------|----------------|---------|---------------|
| `./data/processed-files` | `/app/processed-files` | **CRITICAL** - All video clips, workspace files | Large (GB+) |
| `./data/db` | `/app/prisma/db` | **CRITICAL** - SQLite database | Small (MB) |

### Important Volumes (Recommended for Production)

| Host Path | Container Path | Purpose | Size Estimate |
|-----------|----------------|---------|---------------|
| `./data/temp` | `/app/temp` | Temporary processing files | Variable |
| `./data/logs` | `/app/logs` | Application logs | Small (MB) |

### Volume Configuration Examples

**Bind Mounts (Development):**
```yaml
volumes:
  - ./data/processed-files:/app/processed-files
  - ./data/db:/app/prisma/db
  - ./data/temp:/app/temp
  - ./data/logs:/app/logs
```

**Named Volumes (Production):**
```yaml
volumes:
  - clipshare_data:/app/processed-files
  - clipshare_db:/app/prisma/db
  - clipshare_temp:/app/temp
  - clipshare_logs:/app/logs
```

### Directory Structure

After running, your data directory should look like:
```
data/
├── processed-files/
│   ├── clips/           # Generated video clips
│   ├── exports/         # OBS packages and exports
│   └── workspaces/      # Workspace-specific files
├── db/
│   └── dev.db          # SQLite database file
├── temp/               # Temporary processing files
└── logs/               # Application logs
```

### Backup Recommendations

**Critical Data to Backup:**
1. `./data/processed-files` - Contains all user-generated clips
2. `./data/db` - Database with workspaces and bookmarks

**Backup Script Example:**
```bash
#!/bin/bash
BACKUP_DIR="/backup/clipshare/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup database
cp -r ./data/db "$BACKUP_DIR/"

# Backup processed files (this can be large)
tar -czf "$BACKUP_DIR/processed-files.tar.gz" ./data/processed-files/

echo "Backup completed: $BACKUP_DIR"
```

The application requires several directories to be persistent:

### Required Volumes

1. **`/app/processed-files`** - Stores all processed video clips and workspace files
   - Map to: `./data/processed-files`
   - Critical for data persistence

2. **`/app/temp`** - Temporary files during processing
   - Map to: `./data/temp` 
   - Can be ephemeral but useful for debugging

### Optional Volumes

3. **`/app/prisma/db`** - Database files (if using SQLite)
   - Map to: `./data/db`
   - Required if using file-based database

4. **`/app/logs`** - Application logs
   - Map to: `./data/logs`
   - Helpful for troubleshooting

## Environment Variables

Copy `web/env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL="file:./db/dev.db"

# Authentication
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Plex Configuration
PLEX_SERVER_URL="http://your-plex-server:32400"
PLEX_TOKEN="your-plex-token"
```

## Manual Docker Run

If you prefer to run without docker-compose:

```bash
# Pull the latest image
docker pull ghcr.io/craigjmidwinter/clipshare:latest

# Create data directories
mkdir -p data/{processed-files,temp,db,logs}

# Run the container
docker run -d \
  --name clipshare \
  -p 3000:3000 \
  -v $(pwd)/data/processed-files:/app/processed-files \
  -v $(pwd)/data/temp:/app/temp \
  -v $(pwd)/data/db:/app/prisma/db \
  -v $(pwd)/data/logs:/app/logs \
  --env-file .env \
  ghcr.io/craigjmidwinter/clipshare:latest
```

## CI/CD Workflows

### Docker Build Test (`docker-build-test.yml`)
- **Triggers**: On pull requests and pushes to main that affect the `web/` directory
- **Purpose**: Ensures Docker images build successfully and basic functionality works
- **Blocks**: Prevents merging PRs if Docker build fails
- **Tests**: 
  - Docker image builds without errors
  - Container starts successfully
  - Application responds to HTTP requests

### Docker Build and Publish (`docker-build-deploy.yml`)
- **Triggers**: On pushes to main branch only
- **Purpose**: Builds and publishes production images to GitHub Container Registry
- **Authentication**: Uses `GITHUB_TOKEN` (automatically available)
- **No setup required**: Works out of the box with GitHub Actions

## Docker Image Details

- **Base Image**: Node.js 20 Alpine Linux (matches project's Node.js version requirements)
- **Application**: Next.js application with standalone output
- **Dependencies**: Includes FFmpeg and Python for video processing
- **Port**: Exposes port 3000
- **User**: Runs as non-root user for security
- **Registry**: Published to `ghcr.io/craigjmidwinter/clipshare`

## Available Image Tags

After successful builds, images are available at:

### Version Tags (Recommended for Production)
- `ghcr.io/craigjmidwinter/clipshare:v0.3.2` - Specific version (semantic versioning)
- `ghcr.io/craigjmidwinter/clipshare:0.3.2` - Version without 'v' prefix
- `ghcr.io/craigjmidwinter/clipshare:0.3` - Minor version (automatically updated)
- `ghcr.io/craigjmidwinter/clipshare:0` - Major version (automatically updated)

### Development Tags
- `ghcr.io/craigjmidwinter/clipshare:latest` - Latest main branch build
- `ghcr.io/craigjmidwinter/clipshare:main` - Main branch builds
- `ghcr.io/craigjmidwinter/clipshare:sha-<commit>` - Specific commit builds

### Tag Recommendations
- **Production**: Use specific version tags (e.g., `v0.3.2`) for stability
- **Staging**: Use minor version tags (e.g., `0.3`) for automatic updates within the same minor version
- **Development**: Use `latest` for bleeding-edge features

## Development

### Building Locally

```bash
cd web
docker build -t clipshare:local .
```

### Testing the Build

```bash
# Run the test workflow locally (requires act)
act -W .github/workflows/docker-build-test.yml
```

## Troubleshooting

### Common Issues

1. **Permission denied on volumes**: Ensure the Docker user can write to mapped directories
2. **Database connection issues**: Check the `DATABASE_URL` environment variable
3. **Missing processed files**: Ensure `/app/processed-files` is properly mapped
4. **FFmpeg not found**: The image includes FFmpeg, but check if custom builds removed it

### Debugging

```bash
# Check container logs
docker logs clipshare

# Execute into running container
docker exec -it clipshare sh

# Check volume mounts
docker inspect clipshare | grep -A 10 "Mounts"
```

### Health Check

The container includes a health check that verifies the application is responding:

```bash
# Check health status
docker ps
# or
docker inspect clipshare | grep -A 5 "Health"
```

## Production Deployment

For production deployments:

1. Use a reverse proxy (nginx, traefik) for SSL termination
2. Set up proper backup for the `processed-files` directory
3. Use an external database instead of SQLite for better performance
4. Configure proper logging and monitoring
5. Set strong secrets for `NEXTAUTH_SECRET`

## Backup and Restore

### Backup
```bash
# Backup processed files and database
tar -czf clipshare-backup-$(date +%Y%m%d).tar.gz data/
```

### Restore
```bash
# Stop container
docker-compose down

# Extract backup
tar -xzf clipshare-backup-YYYYMMDD.tar.gz

# Start container
docker-compose up -d
```