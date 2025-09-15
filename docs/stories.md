# Clipshare: Internal Video Collaboration Tool

## Overview

Clipshare is an internal collaboration tool that allows teams to work together on video content from Plex libraries. Users can create workspaces around specific episodes or movies, collaborate on bookmarking with public/private notes, and share clips publicly.

## Roles

- **Producer**: Creates workspaces around Plex content, manages collaborators, exports clips
- **Collaborator**: Views assigned workspaces, creates bookmarks with notes, shares clip links
- **Anonymous viewer**: Opens public clip links without authentication

## Core Stories

### 1) Plex-First Authentication & Onboarding
- As a user, I can sign in using my Plex account to access the collaboration tool.
- **Acceptance Criteria**
  - NextAuth.js with Plex OAuth provider as primary authentication method
  - On login, user profile is created/updated in SQLite with Plex username, email, and avatar
  - Session persists across refresh; logout clears both Clipshare and Plex sessions
  - First-time users complete welcome wizard to gather Plex API credentials
  - Plex API credentials can be provided via environment variables (admin setup)
  - Fallback to email/password if Plex authentication fails
- **UI Requirements**
  - Plex-branded login button with official Plex logo and colors
  - Welcome wizard with steps:
    - Step 1: Welcome screen explaining Clipshare's purpose
    - Step 2: Plex API credentials collection (Client ID, Client Secret, Server URL, Server Token)
    - Step 3: Test Plex connection and fetch user libraries
    - Step 4: Ready to collaborate confirmation
  - Profile sync status indicator showing Plex account connection
  - Error handling for Plex service unavailability with retry options
  - Loading states during Plex authentication process
  - Responsive design optimized for desktop (primary use case)
  - Accessibility: keyboard navigation, screen reader support, proper ARIA labels
  - Clear instructions for obtaining Plex API credentials

### 2) Create Workspaces from Plex Content
- As a Producer, I can select an episode or movie from my Plex library and create a collaborative workspace around it.
- **Acceptance Criteria**
  - Browse Plex libraries (Movies, TV Shows) with search and filter
  - Select specific episodes or movies to create workspaces
  - Workspace includes Plex metadata (title, poster, description, duration)
  - Videos stream directly from Plex server via signed URLs
  - Producer can add collaborators by Plex username (no email invites needed)
  - Workspace shows all collaborators and their activity
- **UI Requirements**
  - Plex library browser with grid/list view and search
  - Episode/movie selection with preview thumbnails and metadata
  - Workspace creation form with title and description
  - Collaborator management interface (add/remove by Plex username)
  - Workspace dashboard showing content, collaborators, and recent activity
  - Visual indicators for workspace status and collaboration activity
  - Responsive design optimized for browsing media libraries

### 3) Collaborative Bookmarking with Notes
- As a collaborator, I can create bookmarks with optional names and public or private notes on workspace content.
- **Acceptance Criteria**
  - Video player with in/out point selection and timecode display
  - Create bookmarks with optional labels/names, public notes (visible to all), and private notes (visible only to creator)
  - Users can add or edit bookmark names at any time after creation
  - Real-time updates when other collaborators add/edit bookmarks
  - Creator can edit their own bookmarks; producer can delete any
  - Bookmark list with search, filter by creator, and note visibility indicators
- **UI Requirements**
  - Custom video player with HLS support and responsive controls
  - Keyboard shortcuts for bookmark creation (I/O points)
  - In/out point markers on timeline with visual indicators
  - Bookmark creation modal with optional label/name field, public notes, and private notes fields
  - Inline editing for bookmark names with save/cancel actions
  - Bookmarks sidebar with search, filter, and visibility indicators
  - Real-time updates with visual indicators for new/edited bookmarks
  - Timecode display with frame-accurate precision
  - Playback speed controls and fullscreen support
  - Accessibility: keyboard navigation, screen reader announcements

### 4) Public Clip Sharing
- As a collaborator, I can share public links to specific bookmarked clips that others can view and download.
- **Acceptance Criteria**
  - Each bookmark gets an unguessable `public_slug`
  - Public `/clip/:slug` page plays only the bookmarked section
  - Seeking beyond bookmark boundaries disabled
  - Clip metadata display (title, duration, creator attribution)
  - Public viewers can download the clip as a video file
  - Producer can revoke public access to any clip
- **UI Requirements**
  - Share button on each bookmark with copy-to-clipboard
  - Public clip page with minimal, clean design
  - Auto-playing video player with disabled seeking controls
  - Download button for public viewers to save clip locally
  - Clip metadata display (title, duration, creator attribution)
  - Social sharing buttons (Twitter, Facebook, LinkedIn)
  - Mobile-optimized responsive design
  - Loading states and error handling for revoked/invalid clips

### 5) Clip Export for Post-Production
- As a Producer, I can export bookmarked clips as video files.
- **Acceptance Criteria**
  - Export individual bookmarks or bulk selection
  - Export triggers background job with progress tracking
  - On completion, downloadable files available
  - Filenames include workspace, content title, bookmark label, timecodes
- **UI Requirements**
  - Export button on individual bookmarks and bulk selection
  - Export queue showing progress for multiple jobs
  - Download links with file size and completion timestamps
  - Export settings modal (quality, format, naming convention)
  - Export history with re-download capabilities

## Technical Architecture

### Frontend (Next.js + TypeScript + Tailwind)
- **App Router pages**
  - `/login` (Plex authentication)
  - `/welcome` (simple onboarding)
  - `/workspaces` (dashboard: workspaces, recent activity)
  - `/workspace/:id` (workspace detail with video player)
  - `/clip/:slug` (public clip viewing)
- **Player**: HLS-first; keyboard shortcuts; bookmarks sidebar; share/export modals

### Backend (Node.js + SQLite + Prisma)
- **Database**: SQLite with Prisma ORM
- **File Storage**: Local filesystem for exported clips
- **Authentication**: NextAuth.js with Plex OAuth provider
- **API Routes**: Next.js API routes for backend logic
- **Database tables**
  - `users` (id, plex_user_id, plex_username, plex_email, plex_avatar_url, onboarding_completed, created_at, updated_at)
  - `workspaces` (id, producer_id, plex_key, plex_server_id, title, description, content_type, content_title, content_poster, content_duration, created_at, updated_at)
  - `memberships` (id, workspace_id, user_id, role, created_at)
  - `bookmarks` (id, workspace_id, created_by, label, public_notes, private_notes, start_ms, end_ms, public_slug, is_public_revoked, created_at, updated_at)
  - `processing_jobs` (id, type, status, payload_json, error_text, created_at, updated_at)
  - `plex_servers` (id, user_id, server_url, token, name, last_sync_at, status, created_at, updated_at)
  - `plex_config` (id, client_id, client_secret, server_url, server_token, is_active, created_at, updated_at)
  - `onboarding_sessions` (id, user_id, current_step, completed_steps, wizard_data_json, created_at, updated_at)
- **Access Control**: Application-level permissions (no RLS needed)
- **Realtime**: WebSocket connections for live bookmark updates

### API Routes
- `/api/auth/[...nextauth]` → NextAuth.js configuration
- `/api/plex/config` → manage Plex API credentials (welcome wizard)
- `/api/plex/connect` → validate Plex server connection and fetch libraries
- `/api/workspaces` → CRUD operations for workspaces
- `/api/bookmarks` → CRUD operations for bookmarks
- `/api/clips/[slug]` → public clip access (no auth)
- `/api/export` → trigger clip export jobs

## Development Setup

### Prerequisites
- Node.js 20+
- Plex server running locally or remotely
- Plex API credentials (for OAuth)

### Installation
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Plex credentials

# Set up database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

### Environment Variables
```bash
# Database
DATABASE_URL="file:./dev.db"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Plex OAuth (optional - can be set via welcome wizard)
PLEX_CLIENT_ID="your-plex-client-id"
PLEX_CLIENT_SECRET="your-plex-client-secret"

# Plex Server (optional - can be set via welcome wizard)
PLEX_SERVER_URL="http://localhost:32400"
PLEX_SERVER_TOKEN="your-plex-server-token"
```

**Note**: Plex API credentials can be provided either via environment variables (for admin setup) or collected during the welcome wizard for first-time users. If not provided via environment variables, the welcome wizard will guide users through obtaining these credentials.

## MVP Definition of Done

- Users authenticate via NextAuth.js with Plex OAuth (primary) or email/password (fallback)
- Producer can create workspaces from Plex episodes/movies
- Collaborators can create bookmarks with public/private notes
- Public clip sharing works without authentication
- Producer can export clips for post-production
- Application-level permissions restrict access appropriately; revocation supported for clips
- **UI Requirements Met**:
  - All features have intuitive, accessible interfaces
  - Responsive design works on desktop (primary) and mobile
  - Loading states and error handling implemented
  - Keyboard shortcuts and accessibility features functional
  - Consistent design system applied throughout
  - User feedback mechanisms (notifications, progress indicators) working

## Design Guidelines

### Design System
- **Typography**: Clean, readable fonts with proper hierarchy
- **Color Palette**: Professional, accessible color scheme with high contrast ratios
- **Spacing**: Consistent spacing using Tailwind's spacing scale
- **Components**: Reusable UI components with consistent styling
- **Icons**: Consistent icon library (Heroicons or similar)

### User Experience Principles
- **Progressive Disclosure**: Show essential information first, details on demand
- **Feedback**: Clear loading states, success/error messages, and progress indicators
- **Consistency**: Uniform patterns across all features and pages
- **Efficiency**: Keyboard shortcuts for power users, bulk operations where appropriate
- **Accessibility**: WCAG 2.1 AA compliance, keyboard navigation, screen reader support

### Responsive Design
- **Mobile First**: Design for mobile, enhance for desktop
- **Breakpoints**: Tailwind's responsive breakpoints (sm, md, lg, xl, 2xl)
- **Touch Targets**: Minimum 44px touch targets for mobile interactions
- **Navigation**: Collapsible navigation for mobile, sidebar for desktop

### Performance Considerations
- **Loading States**: Skeleton screens and progress indicators
- **Lazy Loading**: Load content as needed, especially for large video lists
- **Optimistic Updates**: Update UI immediately, sync with server in background
- **Error Boundaries**: Graceful error handling with recovery options

## Non-Functional Requirements

- **Security**: Private originals, short-lived signed URLs, 128-bit tokens, revocation
- **Performance**: Background jobs, CDN on public clips
- **Reliability**: Idempotent jobs, retries with backoff, persisted progress
- **Accessibility**: Keyboard controls, ARIA labels, caption track support
- **Observability**: Structured logs, job status UI, basic open/download counts