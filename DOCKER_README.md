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
  -v $(pwd)/data/processed-files:/app/processed-files \
  -v $(pwd)/data/temp:/app/temp \
  -v $(pwd)/data/db:/app/prisma/db \
  --env-file .env \
  ghcr.io/craigjmidwinter/clipshare:latest
```

## Important Volume Mappings

- **`/app/processed-files`** - All your video clips and workspace data (CRITICAL)
- **`/app/temp`** - Temporary processing files
- **`/app/prisma/db`** - Database files (if using SQLite)

See `DOCKER_DEPLOYMENT.md` for complete documentation.