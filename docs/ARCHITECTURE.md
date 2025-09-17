# Clipshare Architecture Guide

Deep dive into the technical architecture, design decisions, and system components of Clipshare.

## 📖 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [Technology Stack](#technology-stack)
4. [Application Architecture](#application-architecture)
5. [Database Design](#database-design)
6. [API Architecture](#api-architecture)
7. [Authentication & Authorization](#authentication--authorization)
8. [File Processing Pipeline](#file-processing-pipeline)
9. [Real-time Collaboration](#real-time-collaboration)
10. [External Integrations](#external-integrations)
11. [Performance & Scalability](#performance--scalability)
12. [Security Architecture](#security-architecture)
13. [Deployment Architecture](#deployment-architecture)
14. [Design Decisions](#design-decisions)

## System Overview

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │    │  OBS Studio     │    │  External APIs  │
│   (React/Next)  │    │  Integration    │    │  (Plex Server)  │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Clipshare Application                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Frontend  │  │   API       │  │   Background Jobs       │ │
│  │   (Next.js) │  │   Routes    │  │   (Processing Service)  │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────┬───────────────┬───────────────────┬─────────────────┘
          │               │                   │
          ▼               ▼                   ▼
┌─────────────┐  ┌─────────────┐    ┌─────────────────┐
│  SQLite DB  │  │ File System │    │  External APIs  │
│  (Prisma)   │  │ (Clips)     │    │  (Plex, Auth)   │
└─────────────┘  └─────────────┘    └─────────────────┘
```

### Core Components

**Frontend Layer:**
- Next.js 15.5.3 with App Router
- React Server Components and Client Components
- Tailwind CSS for styling
- Real-time collaboration via WebSockets

**Backend Layer:**
- Next.js API Routes for REST endpoints
- Prisma ORM for database operations
- NextAuth.js for authentication
- Background job processing for video operations

**Data Layer:**
- SQLite database for application data
- Local file system for processed clips
- Plex Media Server integration for source content

**External Services:**
- Plex Media Server for content source
- Plex.tv for authentication
- OBS Studio for live production integration

## Architecture Principles

### Design Philosophy

**1. Plex-First Integration**
- Seamless integration with existing Plex infrastructure
- No content duplication - work directly with Plex libraries
- Preserve user's existing media organization

**2. Real-Time Collaboration**
- Immediate synchronization of changes across clients
- Conflict resolution for concurrent edits
- Optimistic updates with rollback capability

**3. Frame-Accurate Precision**
- Millisecond-precise bookmark timing
- Frame-by-frame navigation support
- Professional-grade timing accuracy

**4. Role-Based Workflows**
- Clear separation between producer and collaborator roles
- Workflow-specific permissions and capabilities
- Scalable team collaboration patterns

**5. Professional Production Ready**
- Export-quality clip generation
- OBS Studio integration for live production
- VTR-style operational patterns

### Technical Principles

**Simplicity Over Complexity:**
- SQLite for simple, reliable data storage
- File-based processing over complex streaming
- Minimal external dependencies

**Performance Focus:**
- Lazy loading for large media libraries
- Background processing for expensive operations
- Efficient real-time updates

**Security by Design:**
- Session-based authentication
- Role-based access control
- Secure Plex token handling

## Technology Stack

### Frontend Technologies

```typescript
// Core Framework
"next": "15.5.3"              // React framework with App Router
"react": "19.0.0"             // UI library
"typescript": "5.7.2"         // Type safety

// Styling & UI
"tailwindcss": "3.4.15"       // Utility-first CSS
"@headlessui/react": "^2.2.0" // Unstyled UI components
"lucide-react": "^0.454.0"    // Icon library

// Forms & Validation
"react-hook-form": "^7.53.2"  // Form handling
"zod": "^3.23.8"              // Schema validation

// Authentication
"next-auth": "5.0.0-beta.25"  // Authentication framework

// State Management
// Built-in React state + Context
// Server state via React Query (future)
```

### Backend Technologies

```typescript
// Database & ORM
"prisma": "^6.1.0"            // Database ORM
"@prisma/client": "^6.1.0"    // Prisma client
// SQLite as database engine

// Authentication
"next-auth": "5.0.0-beta.25"  // Auth with Plex integration

// File Processing
"fluent-ffmpeg": "^2.1.2"     // Video processing
"archiver": "^7.0.1"          // ZIP generation
"node-stream-zip": "^1.15.0"  // ZIP handling

// HTTP & External APIs
"axios": "^1.7.9"             // HTTP client for Plex API
```

### Development & Testing

```typescript
// Testing Framework
"vitest": "^3.2.4"            // Test runner
"@testing-library/react": "^16.1.0" // Component testing
"@testing-library/jest-dom": "^6.6.3" // DOM assertions

// Development Tools
"eslint": "^9.17.0"           // Code linting
"prettier": "^3.4.2"         // Code formatting
"typescript": "^5.7.2"       // Type checking

// Build Tools
"webpack": "via Next.js"      // Module bundling
"turbopack": "via Next.js"    // Fast development builds
```

## Application Architecture

### Next.js App Router Structure

```
src/
├── app/                      # App Router (Next.js 13+)
│   ├── (auth)/              # Route groups
│   │   ├── login/
│   │   └── welcome/
│   ├── (dashboard)/
│   │   ├── workspaces/
│   │   └── workspace/[id]/
│   ├── api/                 # API Routes
│   │   ├── auth/
│   │   ├── plex/
│   │   ├── workspaces/
│   │   └── bookmarks/
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
├── components/              # Reusable components
│   ├── ui/                 # Base UI components
│   ├── forms/              # Form components
│   └── workspace/          # Feature components
├── lib/                    # Utility libraries
│   ├── auth.ts            # Authentication utilities
│   ├── prisma.ts          # Database client
│   ├── plex-service.ts    # Plex API integration
│   └── processing-service.ts # Background jobs
└── types/                 # TypeScript definitions
```

### Component Architecture

**Component Hierarchy:**
```typescript
// Root Layout (app/layout.tsx)
RootLayout
├── SessionProvider (NextAuth)
├── Toaster (Notifications)
└── children (Page content)

// Dashboard Layout (app/(dashboard)/layout.tsx)
DashboardLayout
├── Navigation
├── UserMenu
└── children (Dashboard content)

// Workspace Page (app/workspace/[id]/page.tsx)
WorkspacePage
├── WorkspaceHeader
├── VideoPlayer
│   ├── VideoControls
│   ├── Timeline
│   └── QualitySelector
├── BookmarksSidebar
│   ├── BookmarkList
│   ├── BookmarkItem
│   └── CreateBookmarkModal
└── CollaboratorsList
```

**Component Patterns:**
```typescript
// Server Components (default in App Router)
export default async function WorkspacePage({ params }: { params: { id: string } }) {
  const workspace = await getWorkspace(params.id)
  const bookmarks = await getBookmarks(params.id)
  
  return (
    <div>
      <WorkspaceHeader workspace={workspace} />
      <VideoPlayerClient bookmarks={bookmarks} />
    </div>
  )
}

// Client Components (for interactivity)
'use client'
export function VideoPlayerClient({ bookmarks }: { bookmarks: Bookmark[] }) {
  const [currentTime, setCurrentTime] = useState(0)
  // Interactive video player logic
}
```

### State Management Strategy

**Server State:**
- Database queries via Prisma
- Server Components for initial data loading
- API routes for mutations

**Client State:**
- React useState for local component state
- React Context for shared state (user session, current workspace)
- URL state for navigation and deep linking

**Real-time State:**
- WebSocket connections for live collaboration
- Optimistic updates with server reconciliation
- Event-driven state synchronization

## Database Design

### Schema Architecture

```sql
-- Core Tables
users (
  id          String   @id @default(cuid())
  plexUserId  String   @unique
  plexUsername String
  plexEmail   String   @unique
  plexAvatarUrl String?
  onboardingCompleted Boolean @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
)

workspaces (
  id               String   @id @default(cuid())
  producerId       String   -- FK to users.id
  plexKey          String   -- Plex content identifier
  plexServerId     String?  -- Plex server identifier
  title            String
  description      String?
  contentType      String   -- 'movie' | 'episode' | 'clip'
  contentTitle     String
  contentPoster    String?
  contentDuration  Int?     -- milliseconds
  processingStatus String   @default("pending")
  processingProgress Int    @default(0)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
)

memberships (
  id          String   @id @default(cuid())
  workspaceId String   -- FK to workspaces.id
  userId      String   -- FK to users.id
  role        String   -- 'producer' | 'collaborator'
  createdAt   DateTime @default(now())
  
  @@unique([workspaceId, userId])
)

bookmarks (
  id           String    @id @default(cuid())
  workspaceId  String    -- FK to workspaces.id
  createdBy    String    -- FK to users.id
  label        String
  publicNotes  String?
  privateNotes String?
  startMs      Int       -- Start time in milliseconds
  endMs        Int       -- End time in milliseconds
  lockedBy     String?   -- FK to users.id (if locked)
  lockedAt     DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
)

-- Background Jobs
processingJobs (
  id              String   @id @default(cuid())
  workspaceId     String?  -- FK to workspaces.id
  type            String   -- 'process' | 'download' | 'export'
  status          String   @default("queued")
  payloadJson     String?  -- JSON data for job
  errorText       String?
  progressPercent Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
)

-- Configuration
plexConfig (
  id           String   @id @default(cuid())
  clientId     String
  clientSecret String?
  serverUrl    String?
  serverToken  String?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
)
```

### Relationship Design

**User-Workspace Relationships:**
```typescript
// Many-to-many through memberships
User
├── producedWorkspaces (1:many via producerId)
└── memberships (1:many)
    └── workspace (many:1)

Workspace
├── producer (many:1 via producerId)
├── memberships (1:many)
│   └── user (many:1)
└── bookmarks (1:many)
```

**Data Integrity Patterns:**
```sql
-- Referential integrity
FOREIGN KEY (producerId) REFERENCES users(id) ON DELETE CASCADE
FOREIGN KEY (workspaceId) REFERENCES workspaces(id) ON DELETE CASCADE
FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL

-- Unique constraints
UNIQUE(workspaceId, userId) -- One membership per user per workspace
UNIQUE(plexUserId)          -- One account per Plex user
UNIQUE(plexEmail)           -- One account per email
```

### Query Patterns

**Optimized Queries:**
```typescript
// Workspace with related data
const workspace = await prisma.workspace.findUnique({
  where: { id: workspaceId },
  include: {
    producer: true,
    memberships: {
      include: { user: true }
    },
    bookmarks: {
      include: { creator: true },
      orderBy: { startMs: 'asc' }
    }
  }
})

// User's accessible workspaces
const workspaces = await prisma.workspace.findMany({
  where: {
    OR: [
      { producerId: userId },
      { memberships: { some: { userId } } }
    ]
  },
  include: {
    producer: true,
    _count: {
      select: {
        bookmarks: true,
        memberships: true
      }
    }
  }
})
```

## API Architecture

### REST API Design

**Resource-Based URLs:**
```typescript
// Workspaces
GET    /api/workspaces              // List user's workspaces
POST   /api/workspaces              // Create workspace
GET    /api/workspaces/:id          // Get workspace details
PUT    /api/workspaces/:id          // Update workspace
DELETE /api/workspaces/:id          // Delete workspace

// Workspace actions
POST   /api/workspaces/:id/process  // Trigger processing
GET    /api/workspaces/:id/process  // Get processing status

// Bookmarks
GET    /api/bookmarks               // List bookmarks (filtered by workspace)
POST   /api/bookmarks               // Create bookmark
GET    /api/bookmarks/:id           // Get bookmark
PUT    /api/bookmarks/:id           // Update bookmark
DELETE /api/bookmarks/:id           // Delete bookmark

// Bookmark actions
PATCH  /api/bookmarks/:id/lock      // Lock/unlock bookmark

// Plex integration
GET    /api/plex/config             // Get Plex configuration
POST   /api/plex/config             // Update Plex configuration
POST   /api/plex/connect            // Test Plex connection
GET    /api/plex/library            // Get Plex content
GET    /api/plex/hls                // Get HLS stream URL
```

**Request/Response Patterns:**
```typescript
// Standard response format
interface APIResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    requestId?: string
    pagination?: PaginationInfo
  }
}

// Error handling middleware
export function withErrorHandling(handler: APIHandler) {
  return async (req: NextRequest) => {
    try {
      return await handler(req)
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.errors
          }
        }, { status: 400 })
      }
      
      // Log unexpected errors
      console.error('API Error:', error)
      return NextResponse.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        }
      }, { status: 500 })
    }
  }
}
```

### Authentication Middleware

```typescript
// Authentication utility
export async function requireAuth(req?: NextRequest): Promise<User> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    throw new Error('Authentication required')
  }
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  })
  
  if (!user) {
    throw new Error('User not found')
  }
  
  return user
}

// Workspace permission checking
export async function requireWorkspaceAccess(
  workspaceId: string, 
  userId: string,
  requiredRole?: 'producer' | 'collaborator'
): Promise<{ workspace: Workspace; membership: Membership }> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      memberships: {
        where: { userId }
      }
    }
  })
  
  if (!workspace) {
    throw new Error('Workspace not found')
  }
  
  const membership = workspace.memberships[0]
  const isProducer = workspace.producerId === userId
  
  if (!membership && !isProducer) {
    throw new Error('Access denied')
  }
  
  if (requiredRole === 'producer' && !isProducer) {
    throw new Error('Producer access required')
  }
  
  return { workspace, membership }
}
```

## Authentication & Authorization

### NextAuth.js Configuration

```typescript
// lib/auth.ts
export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: 'plex',
      name: 'Plex',
      type: 'oauth',
      clientId: process.env.PLEX_CLIENT_ID,
      clientSecret: process.env.PLEX_CLIENT_SECRET,
      authorization: {
        url: 'https://app.plex.tv/auth',
        params: {
          clientID: process.env.PLEX_CLIENT_ID,
          forwardUrl: `${process.env.NEXTAUTH_URL}/api/auth/callback/plex`,
          context: {
            device: {
              product: 'Clipshare',
              version: '1.0.0',
              platform: 'Web',
              platformVersion: '1.0.0',
              device: 'Browser',
              deviceName: 'Clipshare Web',
              model: 'Web Browser'
            }
          }
        }
      },
      token: 'https://plex.tv/api/v2/user',
      userinfo: 'https://plex.tv/api/v2/user',
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.username,
          email: profile.email,
          image: profile.thumb
        }
      }
    }
  ],
  
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'plex') {
        // Create or update user in database
        await prisma.user.upsert({
          where: { plexUserId: user.id },
          update: {
            plexUsername: user.name || '',
            plexEmail: user.email || '',
            plexAvatarUrl: user.image || null
          },
          create: {
            plexUserId: user.id,
            plexUsername: user.name || '',
            plexEmail: user.email || '',
            plexAvatarUrl: user.image || null
          }
        })
        return true
      }
      return false
    },
    
    async session({ session, token }) {
      if (session.user?.email) {
        const user = await prisma.user.findUnique({
          where: { plexEmail: session.user.email }
        })
        
        if (user) {
          session.user.id = user.id
          session.user.onboardingCompleted = user.onboardingCompleted
        }
      }
      return session
    }
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  
  pages: {
    signIn: '/login',
    error: '/login'
  }
}
```

### Role-Based Access Control

```typescript
// Permission system
export enum Permission {
  READ_WORKSPACE = 'read:workspace',
  WRITE_WORKSPACE = 'write:workspace',
  DELETE_WORKSPACE = 'delete:workspace',
  MANAGE_MEMBERS = 'manage:members',
  CREATE_BOOKMARK = 'create:bookmark',
  EDIT_BOOKMARK = 'edit:bookmark',
  DELETE_BOOKMARK = 'delete:bookmark',
  EXPORT_OBS = 'export:obs',
  DOWNLOAD_CLIPS = 'download:clips'
}

export const RolePermissions = {
  producer: [
    Permission.READ_WORKSPACE,
    Permission.WRITE_WORKSPACE,
    Permission.DELETE_WORKSPACE,
    Permission.MANAGE_MEMBERS,
    Permission.CREATE_BOOKMARK,
    Permission.EDIT_BOOKMARK,
    Permission.DELETE_BOOKMARK,
    Permission.EXPORT_OBS,
    Permission.DOWNLOAD_CLIPS
  ],
  collaborator: [
    Permission.READ_WORKSPACE,
    Permission.CREATE_BOOKMARK,
    Permission.EDIT_BOOKMARK, // Own bookmarks only
    Permission.DOWNLOAD_CLIPS
  ]
}

export function hasPermission(
  role: string,
  permission: Permission,
  context?: { isOwner?: boolean }
): boolean {
  const permissions = RolePermissions[role as keyof typeof RolePermissions] || []
  
  if (!permissions.includes(permission)) {
    return false
  }
  
  // Special case: collaborators can only edit their own bookmarks
  if (permission === Permission.EDIT_BOOKMARK && role === 'collaborator') {
    return context?.isOwner === true
  }
  
  return true
}
```

## File Processing Pipeline

### Video Processing Architecture

```typescript
// lib/processing-service.ts
export class ProcessingService {
  async processWorkspace(workspaceId: string): Promise<ProcessingJob> {
    const job = await this.createJob({
      type: 'process',
      workspaceId,
      status: 'queued'
    })
    
    // Queue background processing
    await this.queueProcessing(job)
    
    return job
  }
  
  private async queueProcessing(job: ProcessingJob): Promise<void> {
    // In production, this would use a proper job queue (Redis, etc.)
    setImmediate(() => this.executeProcessing(job))
  }
  
  private async executeProcessing(job: ProcessingJob): Promise<void> {
    try {
      await this.updateJobStatus(job.id, 'processing', 0)
      
      const workspace = await this.getWorkspace(job.workspaceId!)
      const plexContent = await this.getPlexContent(workspace.plexKey)
      
      // Update progress through stages
      await this.updateJobStatus(job.id, 'processing', 25)
      await this.generateHLSStreams(plexContent)
      
      await this.updateJobStatus(job.id, 'processing', 75)
      await this.prepareClipGeneration(workspace)
      
      await this.updateJobStatus(job.id, 'complete', 100)
      
    } catch (error) {
      await this.updateJobStatus(job.id, 'error', 0, error.message)
    }
  }
  
  private async generateHLSStreams(content: PlexContent): Promise<void> {
    // Generate HLS streams for web playback
    const streamUrl = await this.plexService.getStreamUrl(content.key, {
      quality: 'original',
      protocol: 'hls'
    })
    
    // Cache stream URLs and metadata
    await this.cacheStreamData(content.key, {
      hlsUrl: streamUrl,
      duration: content.duration,
      generatedAt: new Date()
    })
  }
}
```

### Clip Generation

```typescript
// Clip generation for downloads
export class ClipGenerator {
  async generateClip(bookmark: Bookmark): Promise<string> {
    const workspace = await this.getWorkspace(bookmark.workspaceId)
    const sourceUrl = await this.getSourceUrl(workspace.plexKey)
    
    const outputPath = path.join(
      process.env.CLIPS_DIR || './clips',
      `${bookmark.id}.mp4`
    )
    
    return new Promise((resolve, reject) => {
      ffmpeg(sourceUrl)
        .setStartTime(bookmark.startMs / 1000)
        .setDuration((bookmark.endMs - bookmark.startMs) / 1000)
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run()
    })
  }
  
  async generateOBSPackage(workspaceId: string, options: OBSExportOptions): Promise<string> {
    const workspace = await this.getWorkspace(workspaceId)
    const bookmarks = await this.getBookmarks(workspaceId)
    
    const packageDir = path.join(
      process.env.EXPORT_DIR || './exports',
      `workspace_${workspaceId}_${Date.now()}`
    )
    
    await fs.mkdir(packageDir, { recursive: true })
    
    // Generate individual clips
    const clipPaths = await Promise.all(
      bookmarks.map(bookmark => this.generateClip(bookmark))
    )
    
    // Generate OBS configuration files
    await this.generateOBSScenes(packageDir, bookmarks, options)
    await this.generateHotkeyConfig(packageDir, bookmarks, options)
    await this.generateWebInterface(packageDir, bookmarks, options)
    await this.generateSetupScripts(packageDir, options)
    
    // Create ZIP package
    const zipPath = `${packageDir}.zip`
    await this.createZipArchive(packageDir, zipPath)
    
    return zipPath
  }
}
```

## Real-time Collaboration

### WebSocket Architecture

```typescript
// Real-time collaboration service
export class CollaborationService {
  private connections = new Map<string, WebSocket[]>()
  
  constructor(private server: Server) {
    this.setupWebSocketServer()
  }
  
  private setupWebSocketServer(): void {
    const wss = new WebSocketServer({ server: this.server })
    
    wss.on('connection', (ws, request) => {
      const workspaceId = this.extractWorkspaceId(request.url)
      const userId = this.extractUserId(request.headers)
      
      this.addConnection(workspaceId, ws)
      
      ws.on('message', (data) => {
        this.handleMessage(workspaceId, userId, JSON.parse(data.toString()))
      })
      
      ws.on('close', () => {
        this.removeConnection(workspaceId, ws)
      })
    })
  }
  
  private async handleMessage(
    workspaceId: string,
    userId: string,
    message: CollaborationMessage
  ): Promise<void> {
    switch (message.type) {
      case 'bookmark_update':
        await this.handleBookmarkUpdate(workspaceId, userId, message.data)
        break
      case 'cursor_position':
        await this.handleCursorUpdate(workspaceId, userId, message.data)
        break
      case 'user_typing':
        await this.handleTypingIndicator(workspaceId, userId, message.data)
        break
    }
  }
  
  private async handleBookmarkUpdate(
    workspaceId: string,
    userId: string,
    data: any
  ): Promise<void> {
    // Validate permissions
    await this.validateAccess(workspaceId, userId, 'edit:bookmark')
    
    // Apply optimistic update
    const bookmark = await this.updateBookmark(data.bookmarkId, data.changes)
    
    // Broadcast to all connected clients
    this.broadcast(workspaceId, {
      type: 'bookmark_updated',
      data: { bookmark, updatedBy: userId },
      timestamp: new Date().toISOString()
    })
  }
  
  public broadcast(workspaceId: string, message: CollaborationMessage): void {
    const connections = this.connections.get(workspaceId) || []
    
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message))
      }
    })
  }
}
```

### Conflict Resolution

```typescript
// Operational Transform for collaborative editing
export class ConflictResolver {
  async resolveBookmarkConflict(
    bookmark: Bookmark,
    changes1: BookmarkUpdate,
    changes2: BookmarkUpdate
  ): Promise<Bookmark> {
    // Simple last-write-wins for most fields
    const resolved = { ...bookmark }
    
    // Timestamp-based resolution
    if (changes1.timestamp > changes2.timestamp) {
      Object.assign(resolved, changes1)
    } else {
      Object.assign(resolved, changes2)
    }
    
    // Special handling for text fields (merge if possible)
    if (changes1.publicNotes && changes2.publicNotes) {
      resolved.publicNotes = this.mergeText(
        bookmark.publicNotes || '',
        changes1.publicNotes,
        changes2.publicNotes
      )
    }
    
    return resolved
  }
  
  private mergeText(original: string, edit1: string, edit2: string): string {
    // Simple merge: preserve both changes if they don't overlap
    if (edit1 === edit2) return edit1
    
    // More sophisticated merge logic would go here
    // For now, concatenate with separator
    return `${edit1}\n---\n${edit2}`
  }
}
```

## External Integrations

### Plex API Integration

```typescript
// lib/plex-service.ts
export class PlexService {
  constructor(
    private serverUrl: string,
    private serverToken: string
  ) {}
  
  async getLibraries(): Promise<PlexLibrary[]> {
    const response = await this.plexRequest('/library/sections')
    return response.MediaContainer.Directory.map(this.mapLibrary)
  }
  
  async getLibraryContent(
    libraryKey: string,
    options?: ContentOptions
  ): Promise<PlexContent[]> {
    const params = new URLSearchParams({
      'X-Plex-Container-Start': (options?.offset || 0).toString(),
      'X-Plex-Container-Size': (options?.limit || 50).toString()
    })
    
    if (options?.search) {
      params.append('title', options.search)
    }
    
    const response = await this.plexRequest(
      `/library/sections/${libraryKey}/all?${params}`
    )
    
    return response.MediaContainer.Metadata?.map(this.mapContent) || []
  }
  
  async getStreamUrl(
    contentKey: string,
    options: StreamOptions
  ): Promise<string> {
    const params = new URLSearchParams({
      'X-Plex-Token': this.serverToken,
      protocol: options.protocol || 'hls',
      maxVideoBitrate: this.getQualityBitrate(options.quality),
      videoResolution: this.getQualityResolution(options.quality)
    })
    
    return `${this.serverUrl}${contentKey}/stream?${params}`
  }
  
  private async plexRequest(endpoint: string): Promise<any> {
    const url = `${this.serverUrl}${endpoint}`
    const response = await fetch(url, {
      headers: {
        'X-Plex-Token': this.serverToken,
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new PlexError(`Plex API error: ${response.statusText}`)
    }
    
    return response.json()
  }
  
  private getQualityBitrate(quality: string): string {
    const bitrates = {
      '4k': '25000',
      '1080p': '8000',
      '720p': '4000',
      '480p': '2000',
      'original': '20000'
    }
    return bitrates[quality] || bitrates['original']
  }
}
```

### OBS Studio Integration

```typescript
// lib/obs-export-service.ts
export class OBSExportService {
  async generateOBSSceneCollection(
    workspace: Workspace,
    bookmarks: Bookmark[],
    options: OBSExportOptions
  ): Promise<OBSSceneCollection> {
    const scenes: OBSScene[] = []
    
    // Main scene with all clip sources
    const mainScene: OBSScene = {
      name: 'VTR_Main',
      sources: bookmarks.map((bookmark, index) => ({
        name: `Clip_${index + 1}_${bookmark.label}`,
        type: 'ffmpeg_source',
        settings: {
          local_file: `./clips/${bookmark.id}.mp4`,
          restart_on_activate: true,
          close_when_inactive: true
        },
        visible: false,
        hotkey: this.generateHotkey(index, options.hotkeyPattern)
      }))
    }
    
    // Control scene for monitoring
    const controlScene: OBSScene = {
      name: 'VTR_Control',
      sources: [
        {
          name: 'Web_Interface',
          type: 'browser_source',
          settings: {
            url: 'http://localhost:8080',
            width: 1920,
            height: 1080
          }
        }
      ]
    }
    
    scenes.push(mainScene, controlScene)
    
    return {
      current_scene: 'VTR_Main',
      scenes,
      hotkeys: this.generateHotkeyConfig(bookmarks, options),
      version: '28.0.0'
    }
  }
  
  private generateHotkey(index: number, pattern: string): string {
    switch (pattern) {
      case 'sequential':
        if (index < 12) return `F${index + 1}`
        if (index < 24) return `Ctrl+F${index - 11}`
        return `Alt+F${index - 23}`
        
      case 'numpad':
        return index < 10 ? `Numpad${index}` : `Ctrl+Numpad${index - 10}`
        
      default:
        return `F${Math.min(index + 1, 12)}`
    }
  }
}
```

## Performance & Scalability

### Performance Optimization Strategies

**Frontend Optimization:**
```typescript
// Lazy loading for large lists
const BookmarkList = lazy(() => import('./BookmarkList'))

// Virtual scrolling for many bookmarks
import { FixedSizeList as List } from 'react-window'

function VirtualBookmarkList({ bookmarks }: { bookmarks: Bookmark[] }) {
  const Row = ({ index, style }: { index: number; style: any }) => (
    <div style={style}>
      <BookmarkItem bookmark={bookmarks[index]} />
    </div>
  )
  
  return (
    <List
      height={600}
      itemCount={bookmarks.length}
      itemSize={80}
    >
      {Row}
    </List>
  )
}

// Debounced search
const useSearch = (query: string, delay: number = 300) => {
  const [debouncedQuery, setDebouncedQuery] = useState(query)
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), delay)
    return () => clearTimeout(timer)
  }, [query, delay])
  
  return debouncedQuery
}
```

**Backend Optimization:**
```typescript
// Database query optimization
const getWorkspaceWithBookmarks = async (workspaceId: string) => {
  return prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      bookmarks: {
        select: {
          id: true,
          label: true,
          startMs: true,
          endMs: true,
          creator: {
            select: { id: true, plexUsername: true }
          }
        },
        orderBy: { startMs: 'asc' }
      }
    }
  })
}

// Caching strategy
import { LRUCache } from 'lru-cache'

const plexContentCache = new LRUCache<string, PlexContent>({
  max: 1000,
  ttl: 1000 * 60 * 15 // 15 minutes
})

export async function getCachedPlexContent(key: string): Promise<PlexContent> {
  const cached = plexContentCache.get(key)
  if (cached) return cached
  
  const content = await plexService.getContent(key)
  plexContentCache.set(key, content)
  return content
}
```

### Scalability Considerations

**Horizontal Scaling:**
```typescript
// Database connection pooling
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  // Connection pool configuration
  __internal: {
    engine: {
      binaryTargets: ['native'],
      generator: {
        previewFeatures: ['postgresqlExtensions']
      }
    }
  }
})

// Load balancing for file operations
class FileStorageService {
  private storageNodes = [
    process.env.STORAGE_NODE_1,
    process.env.STORAGE_NODE_2,
    process.env.STORAGE_NODE_3
  ].filter(Boolean)
  
  getStorageNode(workspaceId: string): string {
    const hash = this.hashCode(workspaceId)
    const index = Math.abs(hash) % this.storageNodes.length
    return this.storageNodes[index]
  }
}
```

## Security Architecture

### Security Measures

**Authentication Security:**
```typescript
// Secure session configuration
export const sessionConfig = {
  strategy: 'jwt' as const,
  maxAge: 30 * 24 * 60 * 60, // 30 days
  updateAge: 24 * 60 * 60,    // 24 hours
  generateSessionToken: () => {
    return crypto.randomBytes(32).toString('hex')
  }
}

// Token validation
export function validatePlexToken(token: string): boolean {
  // Validate Plex token format and signature
  return token.length >= 20 && /^[a-zA-Z0-9_-]+$/.test(token)
}
```

**Data Protection:**
```typescript
// Environment variable validation
const requiredEnvVars = [
  'NEXTAUTH_SECRET',
  'DATABASE_URL',
  'PLEX_CLIENT_ID'
]

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`)
  }
})

// Input sanitization
import DOMPurify from 'isomorphic-dompurify'

export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: []
  })
}
```

**Access Control:**
```typescript
// Rate limiting
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 h'),
  analytics: true
})

export async function withRateLimit(
  identifier: string,
  handler: () => Promise<Response>
): Promise<Response> {
  const { success, pending, limit, reset, remaining } = await ratelimit.limit(identifier)
  
  if (!success) {
    return new Response('Rate limit exceeded', { status: 429 })
  }
  
  return handler()
}
```

## Deployment Architecture

### Production Deployment

**Infrastructure Components:**
```yaml
# docker-compose.production.yml
version: '3.8'
services:
  clipshare:
    image: clipshare:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=/data/clipshare.db
      - NEXTAUTH_URL=https://clipshare.company.com
    volumes:
      - clipshare_data:/data
      - clipshare_clips:/app/clips
      - clipshare_exports:/app/exports
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - clipshare_clips:/var/www/clips
    depends_on:
      - clipshare
    restart: unless-stopped

volumes:
  clipshare_data:
  clipshare_clips:
  clipshare_exports:
```

**Environment Configuration:**
```bash
# Production environment variables
NODE_ENV=production
DATABASE_URL=file:/data/clipshare.db
NEXTAUTH_URL=https://clipshare.company.com
NEXTAUTH_SECRET=super-secret-key-32-chars-min

# Plex Configuration
PLEX_CLIENT_ID=your-client-id
PLEX_SERVER_URL=http://plex-server:32400
PLEX_SERVER_TOKEN=your-server-token

# File Storage
CLIPS_DIR=/app/clips
EXPORT_DIR=/app/exports

# Performance
PROCESS_CONCURRENCY=4
MAX_CLIP_SIZE=500MB
```

## Design Decisions

### Key Architectural Decisions

**1. Why SQLite over PostgreSQL?**
- **Simplicity**: No separate database server to manage
- **Performance**: Excellent for read-heavy workloads
- **Backup**: Simple file-based backups
- **Development**: Zero-configuration setup
- **Limitations**: Single-writer, no built-in replication

**2. Why Next.js App Router?**
- **Server Components**: Better performance with server-side rendering
- **File-based routing**: Intuitive URL structure
- **API Routes**: Integrated backend functionality
- **TypeScript**: First-class TypeScript support
- **Future-proof**: Latest React patterns

**3. Why Plex Integration over Generic Video?**
- **Existing Infrastructure**: Leverage users' existing Plex libraries
- **No Storage Duplication**: Work directly with source content
- **Authentication**: Built-in user management via Plex
- **Quality**: Professional-grade video handling
- **Permissions**: Respect existing Plex sharing permissions

**4. Why Real-time Collaboration?**
- **User Experience**: Immediate feedback and updates
- **Workflow Efficiency**: No page refreshes or manual syncing
- **Conflict Prevention**: Real-time conflict detection
- **Team Coordination**: Live awareness of team activity

**5. Why Role-Based Access Control?**
- **Clear Responsibilities**: Producer vs collaborator workflows
- **Security**: Prevent unauthorized access
- **Scalability**: Works with larger teams
- **Flexibility**: Easy to extend with new roles

### Trade-offs and Limitations

**Current Limitations:**
- **Single Plex Server**: Each workspace tied to one Plex server
- **SQLite Concurrency**: Limited concurrent writes
- **File Storage**: Local file system only
- **Real-time Scale**: WebSocket connections limited by server capacity

**Future Architectural Improvements:**
- **Database Migration**: PostgreSQL for larger deployments
- **Distributed Storage**: S3/MinIO for file storage
- **Microservices**: Separate processing service
- **Redis**: Dedicated cache and session storage
- **Queue System**: Redis/RabbitMQ for background jobs

This architecture provides a solid foundation for the current requirements while allowing for future scalability and feature enhancements.