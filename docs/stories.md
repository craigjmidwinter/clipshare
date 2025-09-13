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

#### 2) Create shows and invite collaborators
- As a Producer, I can create a show and invite collaborators by email.
- Acceptance
  - Create show (name, optional description)
  - Invite sends email with a token link; accepting grants membership upon auth
  - Roles: `producer` (owner), `collaborator` (member)
  - Producer can revoke pending invites and remove members

#### 3) Upload long videos with progress
- As a Producer, I can upload large video files with resumable progress.
- Acceptance
  - Direct to Supabase Storage with chunked/resumable upload and a progress UI
  - `videos` row persists metadata and status: uploading → processing → ready|error
  - Background job generates poster image and extracts duration/size
  - Only show members can see/play the full video

#### 4) Secure full-video link for collaborators
- As a Producer, I can generate a secure link to the full video for collaborators.
- Acceptance
  - Signed/expiring link with token, expiry, optional single-use limit
  - Link can require auth or grant temporary access; revocation stops access

#### 5) Video viewer with in/out bookmarking
- As a collaborator, I can set in/out points and save bookmarks with label + notes.
- Acceptance
  - Player UI and hotkeys to set in/out, shows timecodes
  - List of bookmarks (label, notes, creator, timestamps)
  - Creator can edit; producer can delete any; realtime updates visible to members

#### 6) Public clip links (no auth required)
- As a collaborator, I can share a public link that plays only the bookmarked section.
- Acceptance
  - Each bookmark gets an unguessable `public_slug`
  - Public `/clip/:slug` page autoplays at `start_ms` and ends at `end_ms`
  - Seeking beyond out point disabled; revoked clips return 404

#### 7) Clip export for post-production
- As a Producer, I can export clips (single or batch) as video files.
- Acceptance
  - Export triggers background job(s); progress/state visible in UI
  - On completion, downloadable files available (or a .zip)
  - Filenames include show, video, label, timecodes

#### 8) Multiple videos per show
- As a Producer, I can attach multiple videos to a show.
- Acceptance
  - Show detail lists all videos with status/metadata
  - Search/filter by title/date/status; bookmarks scoped per video

#### 9) Permissions and revocation
- As a Producer, I can control access to videos and links.
- Acceptance
  - RLS ensures only members access shows/videos/bookmarks
  - Revocation for secure full-video links and public clip slugs
  - Basic audit fields tracked (created_at, updated_at, last_opened_at where useful)

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



