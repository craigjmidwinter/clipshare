# Clipshare: Internal Video Collaboration Tool

Clipshare is a Next.js TypeScript web application for internal video collaboration with Plex integration. Teams create workspaces around Plex content (episodes/movies), collaborate on bookmarking with public/private notes, and download clips.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

**CRITICAL: Prerequisites**
- Node.js 20+ (verified working: v20.19.5)
- npm 10+ (verified working: v10.8.2)
- All commands should be run from the `web/` directory

**CRITICAL: Network Limitations in Environment**
- Prisma database initialization (`npx prisma db push`) fails due to network restrictions
- Build commands fail due to inability to fetch Google Fonts
- Always document these limitations when they occur

### Bootstrap and Setup
Run these commands in order from the `web/` directory:

```bash
# 1. Install dependencies - takes 1m 12s. NEVER CANCEL. Set timeout to 3+ minutes.
npm install

# 2. Set up environment variables
cp env.example .env.local
# Edit .env.local with appropriate values (see Environment Variables section)

# 3. Generate Plex Client ID (works instantly)
npm run generate-client-id

# 4. Database setup (FAILS in network-restricted environments)
npx prisma db push
# If this fails with network errors, document it but continue
```

### Development Commands

```bash
# Linting - takes 4.6s. NEVER CANCEL. Set timeout to 2+ minutes.
npm run lint

# Testing - takes 42s. NEVER CANCEL. Set timeout to 3+ minutes.
npm run test
npm run test:coverage  # includes coverage reporting
npm run test:watch     # watch mode for development

# Development server - starts in 1.7s but may fail on database operations
npm run dev

# Production build (FAILS due to Google Fonts network issue)
npm run build

# Database tools (fail in network-restricted environments)
npm run db:push    # Apply schema changes
npm run db:studio  # Open Prisma Studio GUI

# Storybook (FAILS due to config export issue)
npm run storybook       # Fails - missing export in main.ts
npm run build-storybook # Fails - missing framework config
```

**Timeout Guidelines:**
- npm install: 3+ minutes
- npm run test: 3+ minutes  
- npm run lint: 2+ minutes
- npm run build: 5+ minutes (though will fail due to fonts)

## Validation

### Manual Testing Scenarios
When making changes, ALWAYS validate with these scenarios:

1. **Authentication Flow**: Test Plex PIN-based login through NextAuth.js
2. **Workspace Creation**: Create workspace from Plex content, add collaborators
3. **Bookmark Collaboration**: Create bookmarks with in/out points, public/private notes
4. **Video Player**: Test HLS playback, timeline scrubbing, keyboard shortcuts
5. **Real-time Updates**: Verify bookmarks appear instantly across sessions
6. **Export Functionality**: Test clip downloads and OBS package generation

### Pre-commit Validation
ALWAYS run these before submitting changes:
```bash
npm run lint    # Fix all errors, warnings acceptable
npm run test    # All tests must pass (when database works)
```

### Component Testing
- Use Vitest with React Testing Library for components
- Test files use `.test.tsx` or `.test.ts` extensions
- Setup file: `src/test/setup.ts`
- Mock external dependencies (Prisma, auth, etc.)

## Environment Variables

Required `.env.local` configuration:
```bash
# Database
DATABASE_URL="file:./dev.db"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Plex Configuration (PIN-based auth - no client secret needed)
PLEX_CLIENT_ID="800c9d71-8ba6-4273-83a4-a71c6dfb3e85"

# Plex Server (optional - can be set via admin setup)
PLEX_SERVER_URL="http://localhost:32400"
PLEX_SERVER_TOKEN="your-plex-server-token"
```

**Getting Plex Credentials:**
- Server Token: Get from Plex server settings (Settings → Network → Plex Token)
- Client ID: Use `npm run generate-client-id` or the pre-configured UUID above

## Architecture Overview

### Frontend (Next.js 15.5.3 + TypeScript + Tailwind)
- **App Router Structure**: `/src/app/` with route-based file system
- **Key Pages**:
  - `/login` - Plex authentication
  - `/welcome` - Onboarding wizard
  - `/workspaces` - Dashboard
  - `/workspace/[id]` - Workspace detail with video player
  - `/admin-setup` - Admin configuration
  - `/test-timeline` - Component testing page

### Backend (Node.js + SQLite + Prisma)
- **Database**: SQLite with Prisma ORM (`web/dev.db`)
- **Authentication**: NextAuth.js with Plex PIN-based provider
- **API Routes**: `/src/app/api/` following Next.js App Router conventions

### Key API Endpoints
- `/api/auth/[...nextauth]` - NextAuth.js configuration
- `/api/plex/config` - Plex API credentials management
- `/api/plex/connect` - Plex server connection validation
- `/api/workspaces` - Workspace CRUD operations
- `/api/workspaces/[id]/process` - Workspace processing jobs
- `/api/bookmarks` - Bookmark CRUD with real-time collaboration
- `/api/downloads` - Clip download generation
- `/api/export` - OBS package export

### Database Schema
- **Users**: Plex integration with username, email, avatar
- **Workspaces**: Content metadata, producer/collaborator roles
- **Bookmarks**: Start/end timestamps, public/private notes, lock state
- **Processing Jobs**: Background tasks for content processing
- **Plex Configuration**: Server connection and API credentials

## Project Structure

```
web/
├── src/
│   ├── app/                    # Next.js App Router pages and API
│   │   ├── api/               # API route handlers
│   │   ├── login/             # Authentication pages
│   │   ├── workspace/         # Workspace detail pages
│   │   └── workspaces/        # Workspace dashboard
│   ├── components/            # React components
│   │   ├── NLETimeline.tsx    # Video timeline component
│   │   └── *.test.tsx         # Component tests
│   ├── lib/                   # Shared utilities
│   │   ├── auth.ts            # NextAuth configuration
│   │   ├── prisma.ts          # Prisma client
│   │   └── processing-service.ts # Background jobs
│   └── types/                 # TypeScript type definitions
├── prisma/
│   └── schema.prisma          # Database schema
├── .storybook/                # Storybook configuration
├── scripts/
│   └── generate-client-id.mjs # Plex Client ID generator
└── vitest.config.ts           # Test configuration
```

## Common Development Tasks

### Schema Changes
1. Edit `prisma/schema.prisma`
2. Run `npx prisma db push` (fails in network-restricted environments)
3. Restart dev server to pick up changes

### Adding API Routes
1. Create files in `src/app/api/[route]/route.ts`
2. Export `GET`, `POST`, `PUT`, `DELETE` functions as needed
3. Use `getServerSession(authOptions)` for authentication
4. Return `NextResponse.json()` for API responses

### Component Development
1. Create components in `src/components/`
2. Add corresponding `.test.tsx` files
3. Use Storybook for isolated development (when config is fixed)
4. Follow existing patterns for TypeScript + Tailwind

### Real-time Features
- Use WebSocket connections for live bookmark updates
- Implement optimistic updates in UI
- Handle connection failures gracefully

## Known Issues and Limitations

### Network-Dependent Failures
- **Prisma**: Cannot download binaries (binaries.prisma.sh unreachable)
- **Google Fonts**: Build fails fetching Geist fonts
- **External APIs**: Limited internet access affects Plex integration testing

### Configuration Issues
- **Storybook**: Missing `export default config` in `.storybook/main.ts`
- **ESLint**: 231 warnings/errors in codebase (mostly TypeScript any types)
- **Tests**: Fail when Prisma client not initialized

### Workarounds
- Use local SQLite file for development when possible
- Mock external dependencies in tests
- Document network failures rather than blocking development
- Focus on business logic and component behavior over integration

## Testing Strategy

### Unit Tests (Vitest)
```bash
npm run test          # Run all tests
npm run test:coverage # With coverage reporting
npm run test:watch    # Watch mode
```

### Coverage Requirements
- Lines: 95%
- Functions: 95% 
- Branches: 95%
- Statements: 95%

### Test Patterns
- Mock Prisma client and auth in API route tests
- Use React Testing Library for component tests  
- Test user interactions and edge cases
- Validate API responses and error handling

### Manual QA Checklist
- [ ] Plex authentication flow works end-to-end
- [ ] Workspace creation from Plex content
- [ ] Video player timeline and bookmark creation
- [ ] Real-time collaboration features
- [ ] Export and download functionality
- [ ] Responsive design on different screen sizes
- [ ] Keyboard shortcuts and accessibility

Remember: Focus on business logic and component behavior. Network-dependent features may not work in restricted environments, but the core application logic should be testable and maintainable.

## Common FAQ and Troubleshooting

### Q: Why does `npx prisma db push` fail?
**A:** Network restrictions prevent downloading Prisma binaries from binaries.prisma.sh. This is expected in sandboxed environments. Document the failure and continue with development.

### Q: Why does the build fail with font errors?
**A:** Cannot fetch Google Fonts due to network restrictions. This is expected. The dev server works fine without fonts.

### Q: Why does Storybook fail to start?
**A:** Missing `export default config` in `.storybook/main.ts`. The config object exists but isn't exported.

### Q: Tests are failing with Prisma errors, what should I do?
**A:** Mock the Prisma client in your tests. Check existing test files for patterns like:
```typescript
vi.mock('@/lib/prisma', () => ({
  prisma: { /* mock methods */ }
}))
```

### Q: How do I test authentication without a real Plex server?
**A:** Mock the NextAuth session and Plex API responses in your tests. The auth module supports mocking for testing.

### Q: What if I can't run the full application due to database issues?
**A:** Focus on component testing and individual API route testing. Many tests work without a fully functional database.

### Q: How long should I wait for commands to complete?
**A:** Use these minimum timeouts:
- `npm install`: 3 minutes
- `npm run test`: 3 minutes
- `npm run build`: 5 minutes (will fail but give it time)
- `npm run lint`: 2 minutes