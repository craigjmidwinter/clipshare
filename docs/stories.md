# Clipshare: Internal Video Collaboration Tool

## Overview

Clipshare is an internal collaboration tool that allows teams to work together on video content from Plex libraries. Users can create workspaces around specific episodes or movies, collaborate on bookmarking with public/private notes, and download clips for offline use and sharing.

## Roles

- **Producer**: Creates workspaces around Plex content, manages collaborators, exports clips
- **Collaborator**: Views assigned workspaces, creates bookmarks with notes, downloads clips

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

### 4) Advanced Bookmarking with In/Out Points & Producer Controls
- As a Collaborator, I can set in/out points on the video timeline to create bookmarks with labels and notes, so I can capture meaningful clips.
- As a Producer, I can also set in/out points, edit or delete any bookmarks, and lock them to finalize clip boundaries for export and OBS integration.
- **Acceptance Criteria**
  - Bookmarks consist of start_ms (In) and end_ms (Out) positions, stored with frame-level precision where possible
  - Both Collaborators and Producers can:
    - Set in/out points using player controls or keyboard shortcuts (I/O)
    - Provide an optional label/name
    - Add public notes (visible to all in workspace)
    - Add private notes (visible only to creator)
    - Real-time collaboration: bookmarks appear instantly across all active sessions
  - Producer privileges:
    - Edit or delete any bookmark
    - Lock bookmarks to prevent edits by others (lock state visible to all)
    - Unlock bookmarks as needed
  - Validation:
    - Out point must be greater than in point
    - Bookmarks cannot exceed video duration
  - Audit trail:
    - Store created_by, updated_at, locked_by, locked_at
- **UI Requirements**
  - **Player Timeline**
    - Visual Markers: In/Out handles rendered as draggable markers on the scrubber
    - Highlighted Range: The selected clip range shaded between In/Out
    - Precision Tools:
      - Zoom control for fine-grained adjustments
      - Nudge buttons (+/- 1 frame, +/- 10 frames)
      - Tooltip showing exact timecode under cursor
    - Accessibility:
      - Keyboard support: arrow keys move current time; Shift modifier nudges In/Out markers
      - Screen reader announcements: "In point set at 00:01:23:12."
  - **Bookmark Sidebar**
    - List View of all bookmarks:
      - Label (or "Untitled" if blank)
      - Time range (HH:MM:SS;FF → HH:MM:SS;FF)
      - Creator avatar/username
      - Visibility indicators (Public/Private)
      - Lock status (icon + tooltip: "Locked by Producer")
    - Inline Editing:
      - Click to rename
      - Hover actions: Edit, Delete, Lock/Unlock, Share
    - Filtering & Search:
      - By creator, lock status, has public/private notes
      - Free-text search across labels/notes
  - **Bookmark Modal/Drawer (Create/Edit)**
    - Time Fields: Display In/Out as read-only with "jump to" and nudge controls
    - Inputs:
      - Label/name field
      - Public notes textarea
      - Private notes textarea (icon to indicate private)
    - Lock State: Shown if bookmark is locked (disabled inputs, lock message)
    - Actions:
      - Save, Cancel
      - Delete (if creator or Producer)
      - Lock/Unlock toggle (Producer only)
  - **Notifications & Real-time Indicators**
    - Toast messages: "Bookmark saved," "Bookmark locked by Producer," etc.
    - Sidebar Badges: Subtle highlight when new bookmarks appear or existing ones are updated
- **Technical Notes**
  - Database already supports start_ms/end_ms; extend schema with locked_by, locked_at for Producer control
  - WebSocket channels broadcast bookmark.created, bookmark.updated, bookmark.deleted, bookmark.locked/unlocked
  - Frontend should debounce rapid In/Out adjustments to avoid overwhelming updates
  - Export flow (Post-Production / OBS Package) reads these ranges directly for clip cutting
  - Workspace processing: download source from Plex → convert to MP4 H.264 → generate preview frames → enable full functionality
  - Processing status: 'pending', 'processing', 'completed', 'failed' with progress percentage
  - Re-processing clears existing processed files and restarts the workflow

### 5) Workspace Clip Downloads
- As a collaborator, I can download clips/bookmarks from the workspace as MP4 H.264 video files for offline use and sharing.
- **Acceptance Criteria**
  - Source video file downloaded and processed during workspace creation
  - Background processing generates MP4 H.264 files at highest available quality
  - Preview frame generation included in background processing
  - Workspace functionality limited until processing completes
  - Download button available on each bookmark for workspace members
  - Download generates video file containing only the bookmarked section (start_ms to end_ms)
  - Filename includes workspace name, content title, bookmark label, and timestamp
  - Producer can download all bookmarks in bulk
  - Producer can re-process workspace files using dedicated button
  - Downloads respect workspace permissions (only members can download)
- **UI Requirements**
  - Workspace creation shows processing progress with status indicators
  - Limited functionality notice during processing (disabled bookmark creation, etc.)
  - Download button on each bookmark (single format, highest quality)
  - Bulk download interface for Producers
  - Producer re-processing button with confirmation dialog
  - Progress indicators during download processing and re-processing
  - Error handling for failed processing with retry options
  - Mobile-optimized download interface
  - Accessibility: keyboard navigation, screen reader support for download controls

### 6) Clip Export for Post-Production
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
- **Player**: HLS-first; keyboard shortcuts; bookmarks sidebar; download/export modals

### Backend (Node.js + SQLite + Prisma)
- **Database**: SQLite with Prisma ORM
- **File Storage**: Local filesystem for downloaded clips and exports
- **Authentication**: NextAuth.js with Plex OAuth provider
- **API Routes**: Next.js API routes for backend logic
- **Database tables**
  - `users` (id, plex_user_id, plex_username, plex_email, plex_avatar_url, onboarding_completed, created_at, updated_at)
  - `workspaces` (id, producer_id, plex_key, plex_server_id, title, description, content_type, content_title, content_poster, content_duration, processing_status, processing_progress, created_at, updated_at)
  - `memberships` (id, workspace_id, user_id, role, created_at)
  - `bookmarks` (id, workspace_id, created_by, label, public_notes, private_notes, start_ms, end_ms, locked_by, locked_at, created_at, updated_at)
  - `processing_jobs` (id, workspace_id, type, status, payload_json, error_text, progress_percent, created_at, updated_at)
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
- `/api/workspaces/[id]/process` → trigger workspace processing/re-processing
- `/api/bookmarks` → CRUD operations for bookmarks
- `/api/downloads` → trigger clip download jobs
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
- Producer can create workspaces from Plex episodes/movies with background processing
- Workspace processing downloads source files and converts to MP4 H.264 with preview frames
- Collaborators can create bookmarks with public/private notes (after processing completes)
- Producer can export clips for post-production
- Workspace members can download clips for offline use
- Producer can re-process workspace files when needed
- Application-level permissions restrict access appropriately
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


