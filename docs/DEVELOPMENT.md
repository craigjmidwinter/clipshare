# Clipshare Development Guide

This comprehensive guide covers everything you need to know to develop, test, and deploy Clipshare.

## 🏗️ Architecture Overview

Clipshare is a full-stack Next.js application with the following stack:

- **Frontend**: Next.js 15.5.3 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + Node.js
- **Database**: SQLite + Prisma ORM
- **Authentication**: NextAuth.js with Plex OAuth
- **Testing**: Vitest + React Testing Library
- **Styling**: Tailwind CSS + CSS Modules

## 📋 Prerequisites

### Required Software
- **Node.js 20+** (verified: v20.19.5)
- **npm 10+** (verified: v10.8.2)
- **Git** for version control
- **Plex Media Server** for testing integration

### Development Environment
- **IDE**: VS Code recommended with extensions:
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense
  - Prisma extension
  - ESLint extension

## 🚀 Initial Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/craigjmidwinter/clipshare.git
cd clipshare/web

# Install dependencies (takes ~1m 12s - be patient!)
npm install --timeout=300000
```

### 2. Environment Configuration

```bash
# Copy environment template
cp env.example .env.local

# Edit .env.local with your settings
```

Required environment variables:

```bash
# Database
DATABASE_URL="file:./dev.db"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Plex Configuration (PIN-based auth)
PLEX_CLIENT_ID="800c9d71-8ba6-4273-83a4-a71c6dfb3e85"

# Plex Server (optional - can be set via admin setup)
PLEX_SERVER_URL="http://localhost:32400"
PLEX_SERVER_TOKEN="your-plex-server-token"
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (may fail in restricted environments)
npx prisma db push
```

**Note**: In network-restricted environments, `prisma db push` may fail due to binary download restrictions. This is expected and documented.

### 4. Start Development Server

```bash
# Start development server (takes ~1.7s to start)
npm run dev
```

Access the application at `http://localhost:3000`

## 🔧 Development Commands

### Core Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Production build (may fail due to fonts)
npm run start                  # Start production server

# Database
npm run db:push               # Apply schema changes
npm run db:studio            # Open Prisma Studio GUI
npm run generate-client-id   # Generate new Plex Client ID

# Code Quality
npm run lint                 # ESLint (231 warnings currently)
npm run type-check          # TypeScript compilation check

# Testing  
npm run test                # Run all tests
npm run test:coverage       # Run tests with coverage
npm run test:watch          # Watch mode for development
```

### Timeout Guidelines

**Important**: Always set appropriate timeouts for long-running commands:

- `npm install`: 3+ minutes
- `npm run test`: 3+ minutes  
- `npm run lint`: 2+ minutes
- `npm run build`: 5+ minutes (will fail due to Google Fonts)

## 📁 Project Structure

```
web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (pages)/           # Route groups
│   │   ├── api/               # API route handlers
│   │   ├── login/             # Authentication pages
│   │   ├── welcome/           # Onboarding wizard
│   │   ├── workspaces/        # Workspace dashboard
│   │   └── workspace/[id]/    # Workspace detail pages
│   ├── components/            # React components
│   │   ├── ui/               # Reusable UI components
│   │   ├── NLETimeline.tsx   # Video timeline component
│   │   └── *.test.tsx        # Component tests
│   ├── lib/                  # Shared utilities
│   │   ├── auth.ts           # NextAuth configuration
│   │   ├── prisma.ts         # Prisma client setup
│   │   ├── processing-service.ts # Background job processing
│   │   └── obs-export-service.ts # OBS package generation
│   ├── types/                # TypeScript type definitions
│   └── test/                 # Test utilities and setup
├── prisma/
│   └── schema.prisma         # Database schema
├── .storybook/               # Storybook configuration
├── public/                   # Static assets
├── scripts/                  # Build and utility scripts
└── [config files]           # Various configuration files
```

## 🗄️ Database Schema

### Core Tables

```sql
-- Users with Plex integration
users (
  id, plex_user_id, plex_username, plex_email, 
  plex_avatar_url, onboarding_completed, created_at, updated_at
)

-- Workspaces around Plex content
workspaces (
  id, producer_id, plex_key, plex_server_id, title, description,
  content_type, content_title, content_poster, content_duration,
  processing_status, processing_progress, created_at, updated_at
)

-- Workspace memberships
memberships (
  id, workspace_id, user_id, role, created_at
)

-- Bookmarks with collaboration features
bookmarks (
  id, workspace_id, created_by, label, public_notes, private_notes,
  start_ms, end_ms, locked_by, locked_at, created_at, updated_at
)

-- Background processing jobs
processing_jobs (
  id, workspace_id, type, status, payload_json, error_text,
  progress_percent, created_at, updated_at
)

-- Plex server configurations
plex_config (
  id, client_id, client_secret, server_url, server_token,
  is_active, created_at, updated_at
)
```

### Schema Management

```bash
# Make schema changes
# 1. Edit prisma/schema.prisma
# 2. Push changes to development database
npx prisma db push

# 3. Generate new Prisma client
npx prisma generate

# 4. Restart dev server to pick up changes
npm run dev
```

## 🛣️ API Routes

### Authentication Routes
- `GET|POST /api/auth/[...nextauth]` - NextAuth.js configuration
- `GET /api/user/onboarding-complete` - Check onboarding status

### Plex Integration Routes
- `GET|POST /api/plex/config` - Manage Plex API credentials
- `POST /api/plex/connect` - Validate Plex server connection
- `GET /api/plex/library` - Fetch Plex library content
- `GET /api/plex/hls` - Generate HLS stream URLs

### Workspace Routes
- `GET|POST /api/workspaces` - List/create workspaces
- `GET|PUT|DELETE /api/workspaces/[id]` - Workspace CRUD
- `POST /api/workspaces/[id]/process` - Trigger processing
- `GET /api/workspaces/[id]/process` - Processing status

### Bookmark Routes
- `GET|POST /api/bookmarks` - List/create bookmarks
- `GET|PUT|DELETE /api/bookmarks/[id]` - Bookmark CRUD

### Export Routes
- `POST /api/downloads` - Generate clip downloads
- `POST /api/export` - Generate OBS packages

## 🧪 Testing Strategy

### Test Structure

```bash
src/
├── components/
│   └── Component.test.tsx     # Component tests
├── app/api/
│   └── route.test.ts         # API route tests
└── test/
    └── setup.ts              # Test configuration
```

### Testing Patterns

```typescript
// Component testing with React Testing Library
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

// Mock external dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    workspace: { create: vi.fn() }
  }
}))

// API route testing
import { NextRequest } from 'next/server'
import { GET } from './route'

describe('/api/example', () => {
  it('should return data', async () => {
    const request = new NextRequest('http://localhost/api/example')
    const response = await GET(request)
    expect(response.status).toBe(200)
  })
})
```

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test src/components/Button.test.tsx

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Coverage Requirements
- Lines: 95%
- Functions: 95%
- Branches: 95%
- Statements: 95%

## 🎨 Styling and UI

### Tailwind CSS

Clipshare uses Tailwind CSS for styling with custom configuration:

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        plex: {
          orange: '#e5a00d',
          // Custom Plex brand colors
        }
      }
    }
  }
}
```

### Component Patterns

```typescript
// Standard component structure
interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  onClick?: () => void
}

export function Button({ children, variant = 'primary', onClick }: ButtonProps) {
  return (
    <button
      className={`px-4 py-2 rounded ${
        variant === 'primary' ? 'bg-blue-500 text-white' : 'bg-gray-200'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
```

## 🔧 Development Workflows

### Adding New Features

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Write Tests First** (TDD approach)
   ```bash
   # Create test file
   touch src/components/NewFeature.test.tsx
   
   # Write failing tests
   npm run test:watch
   ```

3. **Implement Feature**
   - Create components in `src/components/`
   - Add API routes in `src/app/api/`
   - Update types in `src/types/`

4. **Test and Lint**
   ```bash
   npm run test
   npm run lint
   npm run type-check
   ```

5. **Manual Testing**
   ```bash
   npm run dev
   # Test in browser
   ```

### Database Schema Changes

1. **Update Schema**
   ```prisma
   // prisma/schema.prisma
   model NewModel {
     id        String   @id @default(cuid())
     name      String
     createdAt DateTime @default(now())
   }
   ```

2. **Apply Changes**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

3. **Update Types**
   ```typescript
   // src/types/database.ts
   import type { NewModel } from '@prisma/client'
   ```

4. **Test Changes**
   ```bash
   npm run test
   ```

### API Route Development

1. **Create Route File**
   ```typescript
   // src/app/api/example/route.ts
   import { NextRequest, NextResponse } from 'next/server'
   import { getServerSession } from 'next-auth'
   
   export async function GET(request: NextRequest) {
     const session = await getServerSession()
     if (!session) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
     }
     
     return NextResponse.json({ data: 'example' })
   }
   ```

2. **Add Tests**
   ```typescript
   // src/app/api/example/route.test.ts
   import { GET } from './route'
   
   describe('/api/example', () => {
     it('should require authentication', async () => {
       const request = new NextRequest('http://localhost/api/example')
       const response = await GET(request)
       expect(response.status).toBe(401)
     })
   })
   ```

## 🐛 Common Issues and Solutions

### Prisma Client Issues
```bash
# Error: @prisma/client did not initialize yet
npx prisma generate
```

### Network Restrictions
```bash
# Google Fonts build failure (expected in restricted environments)
# Continue development without build
npm run dev
```

### Test Failures
```bash
# Mock Prisma client in tests
vi.mock('@/lib/prisma', () => ({
  prisma: { /* mock implementation */ }
}))
```

### TypeScript Errors
```bash
# Check types
npm run type-check

# Fix common issues
npm run lint --fix
```

## 📈 Performance Considerations

### Build Optimization
- **Code splitting** via Next.js dynamic imports
- **Image optimization** with Next.js Image component
- **Bundle analysis** with `@next/bundle-analyzer`

### Database Performance
- **Indexes** on frequently queried columns
- **Pagination** for large datasets
- **Connection pooling** for production

### Video Performance
- **HLS streaming** for large video files
- **Lazy loading** for video components
- **Progressive enhancement** for older browsers

## 🚀 Deployment Guide

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment instructions.

## 📚 Additional Resources

- **[API Reference](./API.md)** - Detailed API documentation
- **[Testing Guide](./TESTING.md)** - Advanced testing strategies
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues and solutions
- **[Architecture](./ARCHITECTURE.md)** - Deep dive into technical decisions

## 🤝 Contributing

1. **Follow coding standards** - ESLint and Prettier configuration
2. **Write tests** for new features and bug fixes
3. **Update documentation** when making changes
4. **Use conventional commits** for clear commit history
5. **Test thoroughly** before submitting pull requests

Happy coding! 🎉