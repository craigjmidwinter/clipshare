## Local Development: SQLite + NextAuth.js

This project uses a local SQLite database with Prisma ORM and NextAuth.js for authentication, providing a simple development setup without external dependencies.

### Prerequisites

- Node.js 20+
- npm or pnpm

### One-time setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up environment variables:

   ```bash
   cp web/env.example web/.env.local
   ```

3. Configure your environment variables in `web/.env.local`:

   ```bash
   # Database
   DATABASE_URL="file:./dev.db"

   # NextAuth.js
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"

# Plex Configuration (PIN-based authentication - no client secret needed)
# Client ID is pre-filled with a unique identifier (safe to commit to git)
PLEX_CLIENT_ID="800c9d71-8ba6-4273-83a4-a71c6dfb3e85"

   # Plex Server (optional - can be set via admin setup)
   # Server token is sensitive - get from Plex server settings
   PLEX_SERVER_URL="http://localhost:32400"
   PLEX_SERVER_TOKEN="your-plex-server-token"
   ```

   **Getting Plex credentials:**
   - **Server Token**: Get from your Plex server settings (Settings → Network → Plex Token). Keep this secret!
   - **Client ID**: Automatically configured (no action needed)

4. Set up the database:

   ```bash
   cd web
   npx prisma db push
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

   This will:
   - Create SQLite database at `web/dev.db`
   - Start Next.js dev server at `http://localhost:3000`
   - Enable hot reloading for development

### Environment variables

`web/.env.local` includes:

```bash
# Database
DATABASE_URL="file:./dev.db"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Plex Configuration (PIN-based authentication - no client secret needed)
# Client ID is pre-filled with a unique identifier (safe to commit to git)
PLEX_CLIENT_ID="800c9d71-8ba6-4273-83a4-a71c6dfb3e85"

# Plex Server (optional - can be set via admin setup)
# Server token is sensitive - get from Plex server settings
PLEX_SERVER_URL="http://localhost:32400"
PLEX_SERVER_TOKEN="your-plex-server-token"
```

**Note**: Plex uses PIN-based authentication (no client secret needed). The Client ID is automatically configured, but the Server Token should be kept secret.

### Useful scripts

```bash
# Start development server
npm run dev

# Run database migrations
npm run db:push

# Open Prisma Studio (database GUI)
npm run db:studio

# Generate a Plex Client ID (UUID)
npm run generate-client-id

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage
```

### Database management

- **Database file**: `web/dev.db` (SQLite)
- **Schema**: Defined in `web/prisma/schema.prisma`
- **Migrations**: Use `npx prisma db push` for schema changes
- **GUI**: Use `npx prisma studio` to browse data
- **Reset**: Delete `web/dev.db` and run `npx prisma db push`

### Development workflow

1. **Schema changes**: Update `web/prisma/schema.prisma` and run `npx prisma db push`
2. **API development**: Create routes in `web/src/app/api/`
3. **Authentication**: Uses NextAuth.js with Plex PIN-based authentication
4. **File storage**: Local filesystem for exported clips
5. **Testing**: Vitest with React Testing Library for components

### Notes

- SQLite provides a simple, file-based database perfect for development
- No external services required (Docker, Supabase, etc.)
- Plex integration requires valid Plex server credentials
- Database is automatically created on first run
- All data persists in the `web/dev.db` file


