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

### 7) Timeline Snapping with Shot Cut Detection
- As a Collaborator, I can enable/disable timeline snapping when creating or editing bookmarks, so I can precisely align clip boundaries with natural shot cuts in the video.
- As a Producer, I can see visual indicators of detected shot cuts on the timeline and control snapping behavior for all collaborators in the workspace.
- **Acceptance Criteria**
  - Shot cut detection runs automatically during workspace processing using computer vision analysis
  - Detected cuts are stored with frame-accurate timestamps and confidence scores
  - Snapping toggle is available in timeline controls with visual indicator of current state
  - When snapping is enabled, bookmark handles (in/out points) snap to nearby cuts within configurable distance threshold
  - Shot cuts are visually indicated on the timeline by breaking the frame ribbon at cut points
  - Snapping distance is configurable (default: ±2 seconds, range: 0.5-10 seconds)
  - Snapping behavior works for both drag operations and keyboard nudge controls
  - Producer can override snapping settings for the entire workspace
  - Cut detection confidence threshold is configurable (default: 0.7, range: 0.3-0.95)
- **UI Requirements**
  - **Timeline Controls**
    - Snapping toggle button with magnet icon and visual state indicator (enabled/disabled)
    - Snapping distance slider with live preview of snap zones
    - Cut detection confidence slider with tooltip explaining threshold impact
    - Visual feedback when handles snap to cuts (highlighted cut line, snap indicator)
  - **Timeline Visualization**
    - Frame ribbon breaks at detected shot cuts with subtle vertical lines
    - Cut lines are color-coded by confidence level (high confidence: darker, low confidence: lighter)
    - Hover tooltip shows cut timestamp and confidence score
    - Zoom levels affect cut line visibility (show major cuts at all zoom levels)
  - **Snapping Behavior**
    - Smooth snap animation when handles approach cut points
    - Snap zones highlighted with subtle background color when dragging
    - Keyboard nudge controls respect snapping when enabled
    - Snap indicator appears briefly when snapping occurs
  - **Producer Controls**
    - Workspace-level snapping settings override individual user preferences
    - Cut detection re-run option with progress indicator
    - Export cut detection data for external analysis
- **Technical Requirements**
  - **Shot Cut Detection Algorithm**
    - Use OpenCV or similar computer vision library for frame difference analysis
    - Implement histogram comparison and edge detection for cut detection
    - Process video during workspace creation/processing phase
    - Store results in database with timestamps and confidence scores
  - **Database Schema Extensions**
    ```sql
    -- Add to existing schema
    CREATE TABLE shot_cuts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL,
      timestamp_ms INTEGER NOT NULL,
      confidence REAL NOT NULL,
      detection_method TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );
    
    CREATE TABLE workspace_snapping_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL UNIQUE,
      snapping_enabled BOOLEAN DEFAULT true,
      snap_distance_ms INTEGER DEFAULT 2000,
      confidence_threshold REAL DEFAULT 0.7,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );
    ```
  - **API Endpoints**
    - `GET /api/workspaces/[id]/shot-cuts` - Retrieve detected cuts for workspace
    - `POST /api/workspaces/[id]/shot-cuts/detect` - Trigger cut detection (re-run)
    - `GET /api/workspaces/[id]/snapping-settings` - Get workspace snapping configuration
    - `PUT /api/workspaces/[id]/snapping-settings` - Update workspace snapping settings
  - **Processing Integration**
    - Integrate cut detection into existing workspace processing pipeline
    - Run cut detection after video conversion but before frame generation
    - Store processing progress for cut detection phase
    - Handle cut detection failures gracefully with retry options
- **Advanced Features**
  - **Smart Cut Detection**
    - Multiple detection algorithms (histogram, edge, motion) with weighted results
    - Machine learning model training on user feedback for improved accuracy
    - Cut type classification (hard cuts, dissolves, fades) with different snapping behavior
    - Scene boundary detection for more intelligent cut grouping
  - **User Experience Enhancements**
    - Snapping preferences saved per user with workspace override capability
    - Visual cut preview when hovering over cut lines
    - Batch operations respect snapping settings
    - Export cut detection metadata with clips for post-production workflows
  - **Performance Optimization**
    - Background processing with progress indicators
    - Efficient frame sampling for cut detection (every Nth frame)
    - Caching of cut detection results with invalidation on video changes
    - Lazy loading of cut data based on timeline zoom level
- **User Experience Flow**
  1. Workspace processing automatically detects shot cuts during video conversion
  2. Timeline displays cut indicators as vertical breaks in frame ribbon
  3. User enables snapping toggle in timeline controls
  4. When dragging bookmark handles, they snap to nearby cuts within distance threshold
  5. Visual feedback shows snap zones and successful snaps
  6. Producer can adjust workspace-wide snapping settings affecting all collaborators
  7. Cut detection can be re-run if initial results are unsatisfactory
  8. Snapping behavior integrates seamlessly with existing bookmark creation workflow

### 8) OBS VTR Integration for Live Production
- As a Producer, I can export all bookmarked clips from all collaborators in a workspace and generate an OBS-compatible package that allows me to trigger clips during live recording with VTR-like functionality.
- **Acceptance Criteria**
  - Export all bookmarks from all collaborators in a workspace as individual MP4 files
  - Generate a structured folder hierarchy with consistent naming conventions
  - Include metadata files (JSON/XML) with clip information (timing, labels, creator)
  - Create OBS-ready scene collection file (.json) with pre-configured media sources
  - Generate automatic hotkey configuration for OBS Studio
  - Create web-based UI interface for visual clip triggering in OBS
  - Include comprehensive setup guide for OBS integration
- **UI Requirements**
  - **Export Modal**
    - Package Settings: Export format selection (MP4 H.264, ProRes, etc.), Quality settings (1080p, 720p, etc.), Naming convention options
    - Collaborator Filter: Include/exclude specific collaborators from export
    - Hotkey Pattern Selection: Sequential (F1-F12, Ctrl+F1-F12...), Creator-based grouping, Time-based grouping
    - Web Interface Preview: Show generated button layout and styling options
    - Package Preview: List of all clips with thumbnails, metadata summary, file size estimates
  - **Export Queue Interface**
    - Progress tracking for each clip being exported with individual status indicators
    - Overall package generation progress with ETA
    - Error handling with retry options for failed clips
    - Download link when package is ready with file size and completion timestamp
  - **OBS Setup Guide**
    - Step-by-step instructions for importing the package into OBS Studio
    - Hotkey configuration walkthrough with visual guides
    - Web interface setup instructions for browser source
    - Troubleshooting common issues and FAQ
    - Video tutorial integration with embedded guides
- **Technical Requirements**
  - **API Endpoints**
    - `POST /api/workspaces/[id]/export/obs-package` - Generate OBS package with all clips and configuration
    - `GET /api/workspaces/[id]/export/obs-package/[jobId]` - Check export status and progress
    - `GET /api/workspaces/[id]/export/obs-package/[jobId]/download` - Download complete package as ZIP
  - **Generated Package Structure**
    ```
    workspace-name_obs-package/
    ├── clips/
    │   ├── workspace-content-bookmark1.mp4
    │   ├── workspace-content-bookmark2.mp4
    │   └── ...
    ├── metadata/
    │   ├── clips.json (clip timing, labels, creator info)
    │   ├── workspace-info.json (workspace metadata)
    │   └── hotkeys.json (OBS hotkey configuration)
    ├── web-interface/
    │   ├── index.html (OBS browser source interface)
    │   ├── style.css (OBS-optimized styling)
    │   ├── script.js (clip triggering logic)
    │   └── thumbnails/ (preview images for each clip)
    ├── obs/
    │   ├── scene-collection.json (OBS scene collection)
    │   ├── media-sources.json (pre-configured media sources)
    │   └── browser-source.json (web interface configuration)
    └── README.md (comprehensive setup guide)
    ```
  - **Web Interface Features**
    - Responsive grid layout optimized for OBS browser source
    - Visual thumbnails for each clip with hover previews
    - Clip metadata display (duration, creator, label, timecode)
    - One-click playback with visual feedback (button highlights when playing)
    - Keyboard shortcut overlay showing assigned hotkeys
    - Compact mode for small OBS windows with collapsible sections
    - Real-time status indicators (playing, queued, ready)
    - Customizable themes (dark/light) to match OBS interface
  - **Automatic Hotkey Generation**
    - Sequential assignment: F1-F12, Ctrl+F1-F12, Alt+F1-F12, Shift+F1-F12
    - Creator-based grouping: Producer gets F1-F4, Collaborators get Ctrl+F1-F4...
    - Time-based grouping: Early clips get F1-F4, Later clips get Ctrl+F1-F4...
    - Smart conflict detection with OBS defaults and system hotkeys
    - Customizable patterns with preview of assigned hotkeys
    - Generated OBS hotkey configuration file for import
  - **OBS Integration Files**
    - Scene Collection: Pre-configured scenes with media sources and web interface
    - Media Sources: Each clip as separate source with proper audio/video settings
    - Browser Source: Pre-configured web interface with correct dimensions and settings
    - Hotkey Config: JSON file for OBS hotkey import with custom labels
    - Metadata Integration: Clip information accessible in OBS browser sources
- **Advanced Features**
  - **Live Production Enhancements**
    - Clip transitions: Pre-configured transitions between clips
    - Audio levels: Consistent audio normalization across all clips
    - Color correction: Basic color matching between clips from different sources
    - Lower thirds: Optional text overlays with clip labels and creator info
    - Queue management: Ability to queue clips for sequential playback
  - **Workflow Integration**
    - Template system: Save export settings as reusable templates
    - Batch operations: Export multiple workspaces simultaneously
    - Version control: Track different export versions with changelog
    - Collaboration: Share export packages with team members
    - Auto-update: Regenerate package when workspace bookmarks change
  - **Performance Optimization**
    - Background processing with progress tracking
    - Efficient thumbnail generation using ffmpeg
    - Optimized web interface for minimal CPU usage in OBS
    - Compressed package delivery with incremental updates
- **User Experience Flow**
  1. Producer clicks "Export for OBS" button in workspace
  2. Export Modal opens with package configuration options
  3. Producer selects clips, settings, hotkey patterns, and web interface theme
  4. Background processing generates all clips, thumbnails, and OBS files
  5. Download package becomes available when complete with progress summary
  6. Producer downloads ZIP file and follows comprehensive setup guide
  7. OBS import loads scene collection, media sources, and web interface
  8. Live production uses both hotkeys and visual buttons to trigger clips
  9. Web interface provides real-time feedback and status updates during live recording

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
  - `shot_cuts` (id, workspace_id, timestamp_ms, confidence, detection_method, created_at)
  - `workspace_snapping_settings` (id, workspace_id, snapping_enabled, snap_distance_ms, confidence_threshold, created_at, updated_at)
- **Access Control**: Application-level permissions (no RLS needed)
- **Realtime**: WebSocket connections for live bookmark updates

### API Routes
- `/api/auth/[...nextauth]` → NextAuth.js configuration
- `/api/plex/config` → manage Plex API credentials (welcome wizard)
- `/api/plex/connect` → validate Plex server connection and fetch libraries
- `/api/workspaces` → CRUD operations for workspaces
- `/api/workspaces/[id]/process` → trigger workspace processing/re-processing
- `/api/workspaces/[id]/shot-cuts` → retrieve detected cuts for workspace
- `/api/workspaces/[id]/shot-cuts/detect` → trigger cut detection (re-run)
- `/api/workspaces/[id]/snapping-settings` → get/update workspace snapping configuration
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


