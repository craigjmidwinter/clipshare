# Clipshare User Guide

Complete guide to using Clipshare for video collaboration, bookmark creation, and clip generation.

## 📖 Table of Contents

1. [Overview](#overview)
2. [User Roles and Permissions](#user-roles-and-permissions)
3. [Getting Started](#getting-started)
4. [Workspaces](#workspaces)
5. [Video Player and Navigation](#video-player-and-navigation)
6. [Bookmarks and Collaboration](#bookmarks-and-collaboration)
7. [Clip Downloads and Sharing](#clip-downloads-and-sharing)
8. [OBS Integration](#obs-integration)
9. [Advanced Features](#advanced-features)
10. [Tips and Best Practices](#tips-and-best-practices)

## Overview

Clipshare is a video collaboration platform that integrates with Plex Media Server to enable teams to work together on video content. Whether you're creating highlight reels, marking important moments, or preparing content for live production, Clipshare streamlines the process.

### Key Features
- 🎬 **Plex Integration** - Direct access to your media library
- 👥 **Real-time Collaboration** - Multiple users working simultaneously
- 📌 **Precise Bookmarking** - Frame-accurate in/out points
- 💬 **Collaborative Notes** - Public and private annotations
- 📥 **Clip Downloads** - Generate MP4 files for sharing
- 📺 **OBS Export** - Professional live production packages

## User Roles and Permissions

### 🎬 Producer
**Full workspace control and management capabilities**

**Can do:**
- Create and configure workspaces
- Invite and manage collaborators
- Trigger workspace processing
- Export OBS packages
- Download all clips
- Lock/unlock any bookmark
- Delete workspace

**Cannot do:**
- Access other producers' private workspaces without invitation

### 👥 Collaborator
**Content creation and collaboration within assigned workspaces**

**Can do:**
- Create and edit their own bookmarks
- View all public bookmarks
- Add public and private notes
- Download individual clips
- Join workspace discussions

**Cannot do:**
- Modify workspace settings
- Invite other users
- Export OBS packages
- Delete workspace
- Edit other users' bookmarks (unless unlocked)

## Getting Started

### First Login

1. **Access Clipshare** via your organization's URL
2. **Click "Sign in with Plex"** on the login page
3. **Authorize with Plex.tv** - enter your Plex credentials
4. **Complete onboarding** (first-time users only)

### Onboarding Wizard (New Users)

**Step 1: Welcome**
- Overview of Clipshare features
- Role explanation (Producer vs Collaborator)

**Step 2: Plex Configuration**
- Enter Plex server URL (e.g., `http://192.168.1.100:32400`)
- Provide Plex server token from your Plex settings
- Verify connection to your media libraries

**Step 3: Library Access**
- Review available Plex libraries
- Test content access
- Confirm setup completion

**Step 4: Ready to Collaborate**
- Setup confirmation
- Navigate to dashboard

> **💡 Finding Your Plex Server Token:**
> 1. Open Plex Web App
> 2. Go to Settings → Network → Advanced
> 3. Look for "Plex Token" field
> 4. Copy the token string

## Workspaces

### What is a Workspace?

A workspace is a collaborative environment built around **one piece of content** from your Plex library (TV episode, movie, etc.). It contains:

- **Source video content** from Plex
- **All team bookmarks** and annotations
- **Processing status** and generated clips
- **Collaboration tools** and member management

### Creating a Workspace (Producers Only)

1. **From Dashboard**, click **"Create Workspace"**
2. **Browse Plex Content**:
   - Select library (Movies, TV Shows, Music, etc.)
   - Navigate to specific content
   - Choose episode/movie
3. **Configure Workspace**:
   - **Name**: Descriptive title (e.g., "Episode 5 Cold Open")
   - **Description**: Purpose and context (optional)
   - **Collaborators**: Add team members by email
4. **Create and Process**:
   - Click "Create Workspace"
   - Wait for initial processing to complete

### Joining a Workspace

**Via Invitation Email:**
1. Click link in invitation email
2. Sign in with Plex if not already logged in
3. Automatically added as collaborator

**Via Dashboard:**
1. View workspaces you have access to
2. Click workspace name to enter
3. Start collaborating immediately

### Workspace Dashboard

The main workspace interface includes:

- **Video Player** - Primary content viewing area
- **Timeline** - Scrub through content and see bookmarks
- **Bookmark Sidebar** - List of all team bookmarks
- **Control Panel** - Playback controls and tools
- **Member List** - Active collaborators
- **Processing Status** - Background job progress

## Video Player and Navigation

### Player Controls

**Basic Playback:**
- ⏯️ **Play/Pause** - Spacebar or click play button
- ⏪ **Rewind** - Click or use left arrow key
- ⏩ **Fast Forward** - Click or use right arrow key
- 🔊 **Volume** - Mouse wheel or volume slider

**Timeline Navigation:**
- **Click timeline** to jump to specific time
- **Drag timeline** to scrub through content
- **Scroll over timeline** for frame-by-frame control
- **Bookmark markers** show team annotations

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Spacebar` | Play/Pause |
| `←` / `→` | Skip backward/forward (10s) |
| `↑` / `↓` | Volume up/down |
| `F` | Toggle fullscreen |
| `B` | Create bookmark at current time |
| `M` | Mute/unmute |
| `Shift + ←/→` | Frame-by-frame navigation |

### Quality and Performance

**Video Quality:**
- Automatic quality selection based on connection
- Manual quality override in player settings
- HLS streaming for smooth playback

**Performance Tips:**
- Close other browser tabs for better performance
- Use wired internet connection for large files
- Clear browser cache if experiencing issues

## Bookmarks and Collaboration

### Creating Bookmarks

**Method 1: Timeline Clicking**
1. Navigate to desired start time
2. Click "Add Bookmark" button or press `B`
3. Set end time by clicking timeline again
4. Add description and notes
5. Save bookmark

**Method 2: Precise Entry**
1. Use playback controls to find exact frame
2. Note exact timestamp
3. Create bookmark with manual time entry
4. Fine-tune in/out points as needed

### Bookmark Types

**Single Point Bookmarks:**
- Mark specific moments (e.g., "Great reaction shot")
- Default 5-second duration
- Perfect for quick annotations

**Clip Bookmarks:**
- Defined start and end points
- Custom duration (seconds to minutes)
- Used for downloadable clips

### Collaborative Notes

**Public Notes:**
- Visible to all workspace members
- Used for team discussions and feedback
- Show up in real-time for all users
- Perfect for collaborative review sessions

**Private Notes:**
- Only visible to creator
- Personal reminders and thoughts
- Don't clutter shared workspace
- Useful for personal workflow tracking

### Real-time Collaboration

**Live Updates:**
- See bookmarks appear instantly as teammates create them
- Real-time note updates and changes
- Active user indicators show who's online
- Conflict resolution for simultaneous edits

**Bookmark Locking:**
- Lock bookmarks to prevent further changes
- Useful when finalizing selections
- Only bookmark creator or producer can lock/unlock
- Locked bookmarks show special indicator

### Organizing Bookmarks

**Naming Conventions:**
- Use descriptive titles (e.g., "Interview - Key Quote")
- Include timestamp for easy reference
- Add creator initials for clarity
- Use consistent format across team

**Filtering and Sorting:**
- Filter by creator to see specific person's bookmarks
- Sort by time, creation date, or name
- Search bookmark titles and notes
- Hide/show private notes

## Clip Downloads and Sharing

### Processing Requirements

Before downloading clips, the workspace must be **processed**:

1. **Producer triggers processing** from workspace settings
2. **Background job analyzes** source content
3. **HLS streams generated** for web playback
4. **Clip generation enabled** once complete

### Downloading Individual Clips

**Single Clip Download:**
1. Find bookmark in sidebar
2. Click "Download" button
3. Choose quality/format (if available)
4. Wait for generation (first time only)
5. Download MP4 file

**Bulk Downloads:**
1. Select multiple bookmarks using checkboxes
2. Click "Download Selected" button
3. ZIP file generated with all clips
4. Download single archive file

### Clip Formats and Quality

**Available Formats:**
- **MP4 (H.264)** - Standard format, universal compatibility
- **WebM** - Web-optimized format (if available)
- **Original Quality** - Same as source content
- **Optimized** - Smaller file size, good quality

**Quality Options:**
- **Source** - Original Plex quality
- **1080p** - High definition
- **720p** - Standard definition
- **480p** - Lower quality, smaller files

### Sharing Clips

**Internal Sharing:**
- Download clips and share via your organization's file sharing
- Email small clips directly (under 25MB)
- Use shared network drives for team access

**External Sharing:**
- Upload to video hosting platforms
- Use organization-approved sharing methods
- Be mindful of content licensing and permissions

## OBS Integration

### Overview

OBS (Open Broadcaster Software) integration allows producers to create professional live production packages with instant clip access during broadcasts.

### Creating OBS Packages

**Prerequisites:**
- Workspace must be fully processed
- All desired bookmarks created and finalized
- OBS Studio 28+ installed on production machine

**Export Process:**
1. **From workspace**, click "Export for OBS"
2. **Configure package**:
   - Select clips to include
   - Choose quality/format settings
   - Set hotkey patterns (F1-F12, etc.)
   - Customize web interface theme
3. **Generate package** (background processing)
4. **Download ZIP file** when complete

### Package Contents

**Generated Files:**
- **Clip Files** - Individual MP4 videos for each bookmark
- **OBS Scene Collection** - Pre-configured scenes and sources
- **Hotkey Configuration** - Automated key mapping
- **Setup Scripts** - One-click installation
- **Web Interface** - Browser-based control panel
- **Documentation** - Setup and usage guide

### Setting Up OBS

**Automated Setup (Recommended):**
1. Extract downloaded ZIP package
2. Run setup script for your platform:
   - Windows: `setup_obs.bat`
   - Mac/Linux: `setup_obs.sh`
3. OBS automatically configured with scenes and sources

**Manual Setup:**
1. Import scene collection JSON file
2. Configure media sources manually
3. Set up hotkeys from provided mapping
4. Test all clips before going live

For detailed OBS setup instructions, see [OBS Integration Guide](./OBS_INTEGRATION.md).

## Advanced Features

### Workspace Processing

**What it does:**
- Analyzes source video content
- Generates HLS streams for web playback
- Creates downloadable clip files
- Enables advanced features

**When to process:**
- After creating initial bookmarks
- When adding new content
- Before generating downloads
- Prior to OBS export

**Processing Status:**
- **Queued** - Waiting to start
- **Processing** - Currently running
- **Complete** - Ready for use
- **Error** - Check logs and retry

### Batch Operations

**Bulk Bookmark Creation:**
1. Upload CSV file with timestamps
2. Auto-generate bookmarks from spreadsheet
3. Bulk edit descriptions and notes
4. Mass approval workflow

**Batch Downloads:**
1. Select multiple bookmarks
2. Choose consistent format/quality
3. Generate ZIP archive
4. Download all at once

### API Access

For developers and power users:

**Webhooks:**
- Real-time notifications for bookmark changes
- Processing status updates
- Download completion alerts

**REST API:**
- Programmatic workspace management
- Automated bookmark creation
- Integration with other tools

### Integration Features

**Slack Integration:**
- Workspace notifications
- Bookmark sharing in channels
- Processing status updates

**Email Notifications:**
- Digest of daily activity
- Processing completion alerts
- New workspace invitations

## Tips and Best Practices

### Workflow Optimization

**Pre-Production:**
1. **Plan workspace structure** before creating
2. **Establish naming conventions** for consistency
3. **Set up processing early** to catch issues
4. **Test Plex connectivity** before collaboration sessions

**During Collaboration:**
1. **Communicate in real-time** using public notes
2. **Use descriptive bookmark names** for clarity
3. **Lock finalized bookmarks** to prevent changes
4. **Regular processing** for download access

**Post-Production:**
1. **Review all bookmarks** before final export
2. **Test OBS packages** before live events
3. **Archive completed workspaces** for future reference
4. **Document lessons learned** for next time

### Performance Tips

**Video Playback:**
- Use Chrome or Firefox for best performance
- Close unnecessary browser tabs
- Ensure stable internet connection
- Clear browser cache regularly

**Collaboration:**
- Limit simultaneous users during intensive work
- Use private notes for personal tracking
- Coordinate timing for major bookmark sessions
- Communicate workflow via team chat

### Quality Assurance

**Content Verification:**
- Test playback before inviting collaborators
- Verify all bookmarks play correctly
- Check download quality settings
- Validate OBS packages in test environment

**Team Coordination:**
- Establish bookmark review process
- Set deadlines for initial passes
- Designate final approval authority
- Document requirements and standards

### Troubleshooting Common Issues

**Video Won't Play:**
- Check Plex server connection
- Verify content permissions
- Try different browser
- Contact administrator

**Bookmarks Not Saving:**
- Check internet connection
- Refresh page and try again
- Verify workspace permissions
- Contact support if persistent

**Downloads Failing:**
- Ensure workspace is processed
- Check available disk space
- Try different format/quality
- Wait for processing to complete

**OBS Integration Issues:**
- Verify OBS version (28+ required)
- Check file permissions on package
- Run setup script as administrator
- Review OBS logs for errors

### Security and Permissions

**Content Access:**
- Only invite necessary collaborators
- Regularly review workspace members
- Remove access when projects complete
- Be mindful of sensitive content

**Data Protection:**
- Don't share Plex credentials
- Use organization-approved sharing methods
- Follow data retention policies
- Report security concerns immediately

## Getting Help

**Self-Service Resources:**
- [FAQ](./FAQ.md) - Common questions and solutions
- [Troubleshooting Guide](./TROUBLESHOOTING.md) - Technical issues
- [OBS Integration Guide](./OBS_INTEGRATION.md) - Live production setup

**Support Channels:**
- Internal help desk for technical issues
- Team leads for workflow questions
- Administrator for access and permissions
- GitHub Issues for bug reports and feature requests

**Best Practices for Getting Help:**
1. Check documentation first
2. Include specific error messages
3. Describe steps to reproduce issues
4. Mention browser and OS versions
5. Provide workspace ID when relevant

Welcome to efficient video collaboration with Clipshare! 🎬✨