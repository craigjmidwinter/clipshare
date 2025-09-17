# Clipshare Docker Quick Start

## Using Docker Compose (Recommended)

1. **Create data directories:**
   ```bash
   mkdir -p data/{processed-files,temp,db,logs}
   ```

2. **Set up environment:**
   ```bash
   cp web/env.example .env
   # Edit .env with your configuration
   ```

3. **Start the application:**
   ```bash
   docker-compose up -d
   ```

4. **Access the application:**
   Open http://localhost:3000

## Using Docker directly

```bash
docker run -d \
  --name clipshare \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  ghcr.io/craigjmidwinter/clipshare:v0.3.2
```

## Available Image Tags

- **Production (Recommended)**: `ghcr.io/craigjmidwinter/clipshare:v0.3.2`
- **Latest**: `ghcr.io/craigjmidwinter/clipshare:latest`
- **Specific versions**: `v0.3.2`, `v0.3.1`, etc.

Use specific version tags in production for stability.

## Important Volume Mappings

- **`/app/data`** - **SINGLE DATA DIRECTORY** - All your Clipshare data in one place!
  - Contains: video clips, workspace data, database, logs, temp files

⚠️ **Data Loss Warning**: Always map `/app/data` to persistent storage!

**Benefits of Single Data Directory:**
- ✅ Simple setup - only one directory to mount
- ✅ Easy backup - backup everything with one command
- ✅ Clear organization - all data in one place

See `DOCKER_DEPLOYMENT.md` for complete documentation and backup strategies.