## Local Development: Supabase + MinIO

This project supports a local stack with Supabase (auth, database, storage API) and a standalone MinIO S3-compatible object store for assets.

### Prerequisites

- Node.js 20+
- Docker Desktop (or compatible)
- Supabase CLI (`brew install supabase/tap/supabase`)

### One-time setup

1. Start services and web app:

   ```bash
   npm run dev
   ```

   This will:
   - Launch MinIO at `http://localhost:9000` (console at `http://localhost:9001`, user `minioadmin` / `minioadmin`)
   - Create an S3 bucket `clipshare` with public read
   - Start Supabase local stack (Studio at `http://localhost:54323`)
   - Sync Supabase env into `web/.env.local`
   - Start Next.js dev server at `http://localhost:3000`

2. If you need to re-sync envs manually:

   ```bash
   npm run env:sync
   ```

### Environment variables

`web/.env.local` is generated from `supabase/.env` and includes:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000

S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=clipshare
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_FORCE_PATH_STYLE=true
```

Update values if you change MinIO credentials or bucket policy.

### Useful scripts

```bash
# Start only MinIO
npm run minio

# Stop MinIO and remove containers
npm run minio:down

# Start/stop Supabase local stack
npm run supabase:start
npm run supabase:stop
```

### Notes

- Supabase local provides its own storage service. MinIO here is available if/when you add direct S3 integrations (uploads, signed URLs) from the app or edge functions.
- For browser uploads to MinIO, use the S3_* vars and AWS SDK v3. Ensure CORS/bucket policy permits required operations.


