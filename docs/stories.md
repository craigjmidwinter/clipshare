## Clipshare MVP: Feature Stories and Requirements

### Roles
- **Producer**: owns shows, uploads videos, manages access, exports clips
- **Collaborator**: views assigned videos, creates bookmarks, shares clip links
- **Anonymous viewer**: opens public clip links without auth

### Stories and Acceptance Criteria

#### 1) Authentication: Google, Facebook, Magic Link
- As a user, I can sign in w/ Google, Facebook, or magic email link.
- Acceptance
  - Supabase Auth providers enabled: Google, Facebook, Email OTP
  - On login, a `profiles` row is created or updated with display name and avatar
  - Session persists across refresh; logout clears the session
- UI Requirements
  - Clean, modern login page with Clipshare branding
  - Social login buttons (Google, Facebook) with recognizable icons
  - Magic link input field with email validation
  - Loading states during authentication
  - Error handling with user-friendly messages
  - Responsive design for mobile and desktop
  - Accessibility: keyboard navigation, screen reader support, proper ARIA labels

#### 2) Create shows and invite collaborators
- As a Producer, I can create a show and invite collaborators by email.
- Acceptance
  - Create show (name, optional description)
  - Invite sends email with a token link; accepting grants membership upon auth
  - Roles: `producer` (owner), `collaborator` (member)
  - Producer can revoke pending invites and remove members
- UI Requirements
  - Modal/form for creating new shows with validation
  - Show list view with cards showing name, description, member count
  - Invite collaborators modal with email input and role selection
  - Pending invites list with revoke actions
  - Member management interface with role indicators
  - Success/error notifications for all actions
  - Empty states for new users (onboarding)

#### 3) Upload long videos with progress
- As a Producer, I can upload large video files with resumable progress.
- Acceptance
  - Direct to Supabase Storage with chunked/resumable upload and a progress UI
  - `videos` row persists metadata and status: uploading → processing → ready|error
  - Background job generates poster image and extracts duration/size
  - Only show members can see/play the full video
- UI Requirements
  - Drag-and-drop upload area with file validation
  - Real-time progress bar with percentage and speed indicators
  - Upload queue showing multiple files with individual progress
  - Video preview with poster image once uploaded
  - Status indicators: uploading, processing, ready, error
  - Retry mechanism for failed uploads
  - File size limits and format validation with clear error messages

#### 4) Secure full-video link for collaborators
- As a Producer, I can generate a secure link to the full video for collaborators.
- Acceptance
  - Signed/expiring link with token, expiry, optional single-use limit
  - Link can require auth or grant temporary access; revocation stops access
- UI Requirements
  - Generate link modal with expiry date/time picker
  - Single-use toggle option with clear explanation
  - Copy-to-clipboard functionality for generated links
  - Active links list with expiry countdown and revoke actions
  - Link usage statistics (views, remaining uses)
  - QR code generation for easy sharing

#### 5) Video viewer with in/out bookmarking
- As a collaborator, I can set in/out points and save bookmarks with label + notes.
- Acceptance
  - Player UI and hotkeys to set in/out, shows timecodes
  - List of bookmarks (label, notes, creator, timestamps)
  - Creator can edit; producer can delete any; realtime updates visible to members
- UI Requirements
  - Custom video player with HLS support and responsive controls
  - Keyboard shortcuts overlay showing available hotkeys
  - In/out point markers on timeline with visual indicators
  - Bookmark creation modal with label and notes fields
  - Bookmarks sidebar/list with search and filter capabilities
  - Real-time updates when other collaborators add/edit bookmarks
  - Timecode display with frame-accurate precision
  - Playback speed controls and fullscreen support
  - Accessibility: keyboard navigation, screen reader announcements

#### 6) Public clip links (no auth required)
- As a collaborator, I can share a public link that plays only the bookmarked section.
- Acceptance
  - Each bookmark gets an unguessable `public_slug`
  - Public `/clip/:slug` page autoplays at `start_ms` and ends at `end_ms`
  - Seeking beyond out point disabled; revoked clips return 404
- UI Requirements
  - Share button on each bookmark with copy-to-clipboard
  - Public clip page with minimal, clean design
  - Auto-playing video player with disabled seeking controls
  - Clip metadata display (title, duration, creator attribution)
  - Social sharing buttons (Twitter, Facebook, LinkedIn)
  - Mobile-optimized responsive design
  - Loading states and error handling for revoked/invalid clips

#### 7) Clip export for post-production
- As a Producer, I can export clips (single or batch) as video files.
- Acceptance
  - Export triggers background job(s); progress/state visible in UI
  - On completion, downloadable files available (or a .zip)
  - Filenames include show, video, label, timecodes
- UI Requirements
  - Export button on individual bookmarks and bulk selection
  - Export queue showing progress for multiple jobs
  - Download links with file size and completion timestamps
  - Export settings modal (quality, format, naming convention)
  - Email notifications for completed exports
  - Export history with re-download capabilities

#### 8) Multiple videos per show
- As a Producer, I can attach multiple videos to a show.
- Acceptance
  - Show detail lists all videos with status/metadata
  - Search/filter by title/date/status; bookmarks scoped per video
- UI Requirements
  - Video grid/list view with thumbnails and metadata
  - Search and filter controls (title, date, status, duration)
  - Video detail view with bookmark timeline
  - Quick video switching within the same show
  - Video status indicators and processing progress
  - Sort options (date, name, duration, status)

#### 9) Permissions and revocation
- As a Producer, I can control access to videos and links.
- Acceptance
  - RLS ensures only members access shows/videos/bookmarks
  - Revocation for secure full-video links and public clip slugs
  - Basic audit fields tracked (created_at, updated_at, last_opened_at where useful)
- UI Requirements
  - Permission management interface for producers
  - Revoke buttons with confirmation dialogs
  - Access logs and audit trail display
  - Role-based UI elements (show/hide based on permissions)
  - Security warnings for sensitive actions
  - Bulk operations for managing multiple permissions

### Architecture Overview

#### Frontend (Next.js + TypeScript + Tailwind)
- App Router pages
  - `/login`, `/invite/:token`
  - `/app` (dashboard: shows, invited shows, recent videos)
  - `/show/:showId`
  - `/video/:videoId`
  - `/clip/:slug` (public)
- Player: HLS-first; keyboard shortcuts; bookmarks side panel; share/export modals

#### Supabase
- Auth: Google, Facebook, Magic Link
- Storage buckets
  - `videos` (private originals and renditions)
  - `thumbnails` (poster frames; private with signed access)
  - `clips-public` (public exported clips; randomized filenames)
  - `exports` (private batch zips)
- Database tables
  - `profiles` (user_id, display_name, avatar_url)
  - `shows` (id, owner_id, name, description)
  - `memberships` (show_id, user_id, role: producer|collaborator)
  - `videos` (id, show_id, title, storage_path, duration_ms, width, height, status, poster_path, created_by)
  - `bookmarks` (id, video_id, created_by, label, notes, start_ms, end_ms, public_slug, is_public_revoked)
  - `secure_links` (id, video_id, token, expires_at, max_uses, use_count, revoked_at)
  - `invites` (id, show_id, email, token, invited_by, accepted_at, revoked_at)
  - `processing_jobs` (id, type, status, payload_json, error_text)
- RLS policy highlights
  - `shows`: owner read/write; members read
  - `memberships`: producer manage; members read self
  - `videos`: members read; inserts require membership; status updated by job service
  - `bookmarks`: members read; creator edit; producer delete; public via slug function
  - `secure_links`: create/read by producer; tokens validated via edge function
- Realtime: broadcast bookmark CRUD to `video:{id}` channel

#### Edge/Serverless Functions
- `create_upload_url` → signed upload URL + object key
- `on_upload_complete` → persist metadata + enqueue thumbnail/transcode
- `generate_secure_link` / `resolve_secure_link`
- `create_bookmark` / `update_bookmark` / `revoke_clip`
- `resolve_public_clip` → slug to clip payload (no auth)
- `request_clip_export` → enqueue export jobs
- `accept_invite` → token to membership

### UI/UX Design Guidelines

#### Design System
- **Typography**: Clean, readable fonts with proper hierarchy
- **Color Palette**: Professional, accessible color scheme with high contrast ratios
- **Spacing**: Consistent spacing using Tailwind's spacing scale
- **Components**: Reusable UI components with consistent styling
- **Icons**: Consistent icon library (Heroicons or similar)

#### User Experience Principles
- **Progressive Disclosure**: Show essential information first, details on demand
- **Feedback**: Clear loading states, success/error messages, and progress indicators
- **Consistency**: Uniform patterns across all features and pages
- **Efficiency**: Keyboard shortcuts for power users, bulk operations where appropriate
- **Accessibility**: WCAG 2.1 AA compliance, keyboard navigation, screen reader support

#### Responsive Design
- **Mobile First**: Design for mobile, enhance for desktop
- **Breakpoints**: Tailwind's responsive breakpoints (sm, md, lg, xl, 2xl)
- **Touch Targets**: Minimum 44px touch targets for mobile interactions
- **Navigation**: Collapsible navigation for mobile, sidebar for desktop

#### Performance Considerations
- **Loading States**: Skeleton screens and progress indicators
- **Lazy Loading**: Load content as needed, especially for large video lists
- **Optimistic Updates**: Update UI immediately, sync with server in background
- **Error Boundaries**: Graceful error handling with recovery options

### Non-Functional Requirements
- Security: private originals, short-lived signed URLs, 128-bit tokens, revocation
- Performance: resumable uploads, background jobs, CDN on public clips
- Reliability: idempotent jobs, retries w/ backoff, persisted progress
- Accessibility: keyboard controls, ARIA labels, caption track support
- Observability: structured logs, job status UI, basic open/download counts

### MVP Definition of Done
- Users can auth via Google, Facebook, and magic link
- Producer can create shows, invite collaborators, upload videos, share secure links
- Collaborators can create bookmarks and share public clip links viewable without auth
- Producer can export and download clips
- RLS policies restrict access appropriately; revocation supported for links/clips
- **UI Requirements Met**:
  - All features have intuitive, accessible interfaces
  - Responsive design works on mobile and desktop
  - Loading states and error handling implemented
  - Keyboard shortcuts and accessibility features functional
  - Consistent design system applied throughout
  - User feedback mechanisms (notifications, progress indicators) working



