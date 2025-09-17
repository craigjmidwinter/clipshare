# Clipshare FAQ

Frequently asked questions and solutions for common issues when using Clipshare.

## 📖 Table of Contents

1. [General Questions](#general-questions)
2. [Getting Started](#getting-started)
3. [Plex Integration](#plex-integration)
4. [Workspaces](#workspaces)
5. [Bookmarks and Collaboration](#bookmarks-and-collaboration)
6. [Video Playback](#video-playback)
7. [Downloads and Exports](#downloads-and-exports)
8. [OBS Integration](#obs-integration)
9. [Permissions and Access](#permissions-and-access)
10. [Technical Issues](#technical-issues)
11. [Performance](#performance)
12. [Development](#development)

---

## General Questions

### What is Clipshare?

**Q: What is Clipshare and what does it do?**

A: Clipshare is an internal video collaboration tool that integrates with Plex Media Server to enable teams to work together on video content. Key features include:

- Creating collaborative workspaces around Plex content
- Precise bookmarking with frame-accurate timing
- Real-time collaboration with public/private notes
- Clip downloads in various formats
- Professional OBS integration for live production
- VTR (Video Tape Recorder) functionality for broadcasting

### Who should use Clipshare?

**Q: Who is Clipshare designed for?**

A: Clipshare is designed for:

- **Content creators** who need to review and edit video content
- **Production teams** collaborating on video projects
- **Live streamers** who want professional clip management
- **Organizations** with internal video workflows
- **Teams** that need frame-accurate collaboration tools

### How is Clipshare different from other video tools?

**Q: What makes Clipshare unique?**

A: Clipshare's unique features include:

- **Direct Plex integration** - Work with your existing media library
- **Real-time collaboration** - Multiple users editing simultaneously
- **Frame-accurate bookmarking** - Precise timestamp control
- **Professional OBS export** - One-click live production setup
- **Role-based permissions** - Producer and collaborator workflows
- **No video uploads** - Works with your existing Plex content

---

## Getting Started

### First-time Setup

**Q: How do I get started with Clipshare?**

A: Follow these steps:

1. **Access Clipshare** via your organization's URL
2. **Sign in with Plex** using your existing Plex account
3. **Complete onboarding** by providing Plex server details
4. **Test connection** to ensure Plex integration works
5. **Create your first workspace** or join existing ones

**Q: I don't have a Plex account. Can I still use Clipshare?**

A: No, Clipshare requires a Plex account and access to a Plex Media Server. You'll need to:

1. Create a Plex account at [plex.tv](https://plex.tv)
2. Have access to a Plex Media Server (yours or shared)
3. Obtain necessary permissions to access the media content

### Account and Authentication

**Q: Why do I need to sign in with Plex?**

A: Plex authentication ensures:

- **Secure access** to your media content
- **Proper permissions** based on your Plex account
- **Seamless integration** with your existing Plex library
- **User identity** for collaboration features

**Q: Can I use a different email than my Plex account?**

A: No, Clipshare uses your Plex account information for authentication and user identification. Your Plex email will be used as your Clipshare identity.

---

## Plex Integration

### Server Connection

**Q: I can't connect to my Plex server. What should I do?**

A: Try these troubleshooting steps:

1. **Verify server URL**: Ensure it's accessible (e.g., `http://192.168.1.100:32400`)
2. **Check server token**: Get a fresh token from Plex settings
3. **Test network access**: Ensure the server is reachable from Clipshare
4. **Check firewall**: Make sure port 32400 is accessible
5. **Server status**: Verify your Plex server is running

**Q: How do I find my Plex server token?**

A: To get your Plex server token:

1. Open Plex Web App
2. Go to Settings → Network
3. Click "Show Advanced" if needed
4. Look for "Plex Token" field
5. Copy the long string of characters
6. Keep this token secure and private

**Q: Can I use Plex.tv remote access instead of direct server connection?**

A: Yes, but direct connection is recommended for better performance. If using remote access:

- Use your public Plex server URL
- Ensure remote access is enabled in Plex settings
- Performance may be slower than direct connection

### Content Access

**Q: Some of my Plex content doesn't appear in Clipshare. Why?**

A: Common reasons include:

- **Library permissions**: You may not have access to all libraries
- **Content type**: Clipshare works best with video content (movies, TV shows)
- **Processing status**: Content might still be processing in Plex
- **File format**: Some formats may not be supported
- **Server sync**: Try refreshing your Plex libraries

**Q: Can I use content from shared Plex servers?**

A: Yes, if you have access to shared Plex libraries, you can create workspaces with that content. Ensure you have appropriate permissions from the library owner.

---

## Workspaces

### Creating Workspaces

**Q: What's the difference between a Producer and Collaborator?**

A: **Producer**:
- Creates and manages workspaces
- Invites collaborators
- Controls workspace settings
- Can export OBS packages
- Has full administrative control

**Collaborator**:
- Creates bookmarks and notes
- Views and collaborates on content
- Downloads individual clips
- Cannot modify workspace settings
- Cannot invite other users

**Q: Can I change a workspace from one piece of content to another?**

A: No, workspaces are tied to specific Plex content (episode, movie, etc.). To work with different content, create a new workspace.

**Q: How many collaborators can I add to a workspace?**

A: There's no hard limit, but performance is optimal with 5-10 active collaborators. Larger teams may experience slower real-time updates.

### Workspace Management

**Q: Can I delete a workspace?**

A: Yes, producers can delete workspaces they created. **Warning**: This permanently removes all bookmarks and associated data. Consider exporting important content first.

**Q: What happens if the producer leaves the organization?**

A: Contact your administrator to transfer workspace ownership or export important data before the producer account is deactivated.

**Q: Can I duplicate a workspace?**

A: Not directly, but you can:
1. Export bookmarks as data
2. Create a new workspace with the same content
3. Manually recreate important bookmarks
4. Use this for template-style workflows

---

## Bookmarks and Collaboration

### Creating Bookmarks

**Q: How precise are the bookmark timestamps?**

A: Clipshare supports frame-accurate timing, typically accurate to within 1/24th or 1/30th of a second depending on your content's frame rate.

**Q: Can I edit bookmarks after creating them?**

A: Yes, you can edit your own bookmarks unless they're locked. You can modify:
- Label/description
- Start and end times
- Public and private notes
- All aspects except the creator

**Q: What's the difference between public and private notes?**

A: - **Public notes**: Visible to all workspace members, used for team communication
- **Private notes**: Only visible to you, used for personal reminders and workflow tracking

### Collaboration Features

**Q: Why can't I see changes from other team members?**

A: Try these solutions:

1. **Refresh the page** to sync latest changes
2. **Check internet connection** for real-time updates
3. **Verify workspace membership** - ensure you're still a member
4. **Browser issues** - try a different browser or clear cache

**Q: Can I work offline?**

A: No, Clipshare requires an internet connection for:
- Real-time collaboration features
- Plex content streaming
- Bookmark synchronization
- Video playback

**Q: What happens if two people edit the same bookmark simultaneously?**

A: Clipshare handles conflicts by:
- Showing both sets of changes
- Allowing manual conflict resolution
- Preserving all data when possible
- Notifying users of conflicts

---

## Video Playback

### Playback Issues

**Q: Video won't play or loads slowly. What should I do?**

A: Common solutions:

1. **Check Plex server status** - ensure it's running and accessible
2. **Internet connection** - verify stable, fast connection
3. **Browser compatibility** - use Chrome, Firefox, Safari, or Edge
4. **Clear browser cache** - remove old cached data
5. **Try different quality** - lower quality for better performance
6. **Restart browser** - close and reopen completely

**Q: Video quality is poor or pixelated. How can I improve it?**

A: Try these approaches:

- **Check source quality** in Plex - ensure original is high quality
- **Increase quality settings** in Clipshare player
- **Improve internet connection** - faster connection = better quality
- **Check Plex transcoding** - ensure server can handle quality requested
- **Use direct play** when possible for best quality

### Player Controls

**Q: What keyboard shortcuts are available?**

A: Common shortcuts include:

| Key | Action |
|-----|--------|
| `Spacebar` | Play/Pause |
| `←` / `→` | Skip backward/forward (10s) |
| `↑` / `↓` | Volume up/down |
| `F` | Toggle fullscreen |
| `B` | Create bookmark at current time |
| `M` | Mute/unmute |
| `Shift + ←/→` | Frame-by-frame navigation |

**Q: Can I change the skip interval (currently 10 seconds)?**

A: Currently, the skip interval is fixed at 10 seconds. This may become customizable in future updates.

---

## Downloads and Exports

### Clip Downloads

**Q: Why can't I download clips from my workspace?**

A: Ensure these requirements are met:

1. **Workspace is processed** - background processing must be complete
2. **You have permissions** - collaborators can download individual clips
3. **Bookmarks exist** - must have bookmarks to download
4. **Server accessibility** - Plex server must be reachable for processing

**Q: How long does it take to generate clip downloads?**

A: Generation time depends on:

- **Clip length**: Longer clips take more time
- **Quality settings**: Higher quality = longer processing
- **Server performance**: Faster Plex server = quicker generation
- **Network speed**: Affects both processing and download
- **Queue status**: Other users' jobs may be ahead of yours

Typical times:
- Short clips (< 30 seconds): 30-60 seconds
- Medium clips (1-5 minutes): 2-5 minutes
- Long clips (> 5 minutes): 5+ minutes

**Q: What video formats are available for download?**

A: Standard formats include:

- **MP4 (H.264)**: Universal compatibility, recommended
- **Original quality**: Same format/quality as source
- **Web optimized**: Smaller file size, good quality
- **Multiple resolutions**: 1080p, 720p, 480p (if source supports)

### Processing Issues

**Q: My workspace has been "processing" for hours. Is this normal?**

A: No, typical processing should complete within:

- **Small content** (< 30 minutes): 5-15 minutes
- **Medium content** (30-60 minutes): 15-30 minutes
- **Large content** (> 60 minutes): 30-60 minutes

If processing takes longer:
1. Check Plex server performance
2. Verify network connectivity
3. Contact administrator for status
4. Consider re-triggering processing

---

## OBS Integration

### Package Export

**Q: What do I need to use OBS integration?**

A: Requirements include:

- **OBS Studio 28.0+** installed on your production machine
- **Python 3.7+** for automated setup scripts
- **Processed workspace** with finalized bookmarks
- **Producer permissions** to export packages
- **Modern browser** for web interface (optional)

**Q: The OBS setup script isn't working. What should I do?**

A: Try these solutions:

1. **Run as administrator** (Windows) or with `sudo` (Mac/Linux)
2. **Check OBS version** - ensure 28.0 or newer
3. **Verify Python installation** - script requires Python 3.7+
4. **Manual setup** - import scene collection and configure manually
5. **Check file permissions** - ensure package files are accessible

### Live Production

**Q: Hotkeys aren't working during live stream. Help!**

A: Troubleshoot hotkey issues:

1. **Check OBS hotkey settings** - verify keys are assigned correctly
2. **Test outside of streaming** - ensure hotkeys work in OBS
3. **Check for conflicts** - other software may be using same keys
4. **OBS focus** - ensure OBS has keyboard focus
5. **Restart OBS** - reload scene collection and test again

**Q: Can I modify the generated OBS scenes and sources?**

A: Yes, you can customize:

- Scene names and organization
- Source properties and settings
- Hotkey assignments
- Audio levels and filters
- Visual layouts and positioning

However, regenerating the package will overwrite custom changes.

---

## Permissions and Access

### User Roles

**Q: Can I be a producer for some workspaces and collaborator for others?**

A: Yes, your role is specific to each workspace:
- You can be the producer of workspaces you create
- You can be a collaborator in workspaces others invite you to
- Your permissions change based on your role in each workspace

**Q: How do I remove someone from my workspace?**

A: As a producer:
1. Go to workspace settings
2. Find the member list
3. Click "Remove" next to their name
4. Confirm removal

Removed users lose access immediately but their existing bookmarks remain.

### Content Access

**Q: Can I restrict access to specific bookmarks?**

A: Currently, all workspace members can see all public bookmarks. Private notes are only visible to their creator. Future updates may include more granular permissions.

**Q: What happens to my bookmarks if I leave a workspace?**

A: Your bookmarks remain in the workspace for other collaborators to use, but you lose the ability to edit them. Consider downloading any important clips before leaving.

---

## Technical Issues

### Browser and Compatibility

**Q: Which browsers work best with Clipshare?**

A: Recommended browsers:

1. **Chrome** (latest version) - Best performance and compatibility
2. **Firefox** (latest version) - Good alternative with excellent performance
3. **Safari** (macOS) - Works well on Mac systems
4. **Edge** (latest version) - Good compatibility on Windows

Avoid: Internet Explorer, older browser versions

**Q: Clipshare seems slow or unresponsive. How can I improve performance?**

A: Performance optimization tips:

1. **Close other browser tabs** - Reduce memory usage
2. **Use wired internet** - More stable than Wi-Fi
3. **Clear browser cache** - Remove old data
4. **Restart browser** - Fresh start often helps
5. **Check system resources** - Ensure adequate RAM and CPU
6. **Update browser** - Latest versions perform best

### Connection Issues

**Q: I keep getting disconnected from Clipshare. Why?**

A: Common causes and solutions:

- **Session timeout**: Sign in again if inactive for too long
- **Network instability**: Check internet connection stability
- **Server maintenance**: Temporary disconnections during updates
- **Browser issues**: Try different browser or clear cache
- **VPN/Firewall**: Corporate networks may interfere

**Q: Real-time collaboration isn't working. What should I check?**

A: Troubleshoot real-time features:

1. **WebSocket connection** - Check browser developer tools for errors
2. **Firewall settings** - Ensure WebSocket traffic is allowed
3. **Network stability** - Unstable connections break real-time features
4. **Browser compatibility** - Ensure modern browser with WebSocket support
5. **Refresh page** - Sometimes reconnection is needed

---

## Performance

### Optimization

**Q: How can I improve Clipshare performance?**

A: Performance best practices:

**System Level:**
- Use fast, stable internet connection (10+ Mbps recommended)
- Ensure adequate RAM (8GB+ recommended)
- Use SSD storage for better file access
- Close unnecessary applications

**Browser Level:**
- Use recommended browsers (Chrome, Firefox)
- Keep browser updated
- Clear cache regularly
- Limit open tabs
- Disable unnecessary extensions

**Network Level:**
- Use wired connection when possible
- Ensure Plex server has sufficient bandwidth
- Check for network congestion
- Consider local network optimization

**Q: Large workspaces are slow to load. Is this expected?**

A: Some slowdown is normal for workspaces with:

- 100+ bookmarks
- Very long content (2+ hours)
- Many collaborators (10+)
- Complex bookmark structures

Optimization strategies:
- Archive old bookmarks
- Split large projects into smaller workspaces
- Use focused collaboration sessions
- Consider workspace organization

---

## Development

### Setup Issues

**Q: I'm a developer. How do I set up the development environment?**

A: See the [Development Guide](./DEVELOPMENT.md) for complete setup instructions. Key steps:

1. **Install Node.js 20+** and npm 10+
2. **Clone repository** and navigate to `web/` directory
3. **Install dependencies** with `npm install` (takes ~1-2 minutes)
4. **Set up environment** variables in `.env.local`
5. **Initialize database** with `npx prisma db push`
6. **Start development** server with `npm run dev`

**Q: Tests are failing. What should I check?**

A: Common test issues:

1. **Prisma client**: Run `npx prisma generate`
2. **Dependencies**: Ensure `npm install` completed successfully
3. **Environment**: Check `.env.local` configuration
4. **Database**: Verify SQLite database is accessible
5. **Mocks**: Ensure test mocks are properly configured

See [Testing Guide](./TESTING.md) for detailed testing information.

**Q: The build fails with network errors. Is this expected?**

A: Yes, in network-restricted environments:

- **Prisma binary downloads** may fail (expected limitation)
- **Google Fonts** fetching may fail during build
- **External API calls** may be blocked

These are documented limitations in restricted development environments. Focus on local development with `npm run dev`.

---

## Getting More Help

### Support Resources

**Q: Where can I find more help?**

A: Available resources:

1. **Documentation**: Complete guides in `/docs` directory
   - [Getting Started Guide](./GETTING_STARTED.md)
   - [User Guide](./USER_GUIDE.md)
   - [Development Guide](./DEVELOPMENT.md)
   - [OBS Integration Guide](./OBS_INTEGRATION.md)

2. **Technical Support**:
   - [Troubleshooting Guide](./TROUBLESHOOTING.md)
   - [API Reference](./API.md)
   - Internal help desk (if available)

3. **Community**:
   - GitHub Issues for bugs and feature requests
   - Team collaboration channels
   - User feedback sessions

**Q: How do I report a bug or request a feature?**

A: For bug reports:

1. **Check existing issues** on GitHub first
2. **Provide detailed information**:
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser and OS details
   - Screenshots if relevant
3. **Include relevant logs** or error messages
4. **Use appropriate labels** (bug, enhancement, etc.)

**Q: Can I contribute to Clipshare development?**

A: Yes! Contribution opportunities:

- **Bug fixes** and improvements
- **Documentation** updates and enhancements
- **Feature development** based on roadmap
- **Testing** and quality assurance
- **User experience** feedback and suggestions

See the development documentation for contribution guidelines.

---

*Need something not covered here? Check our other documentation or reach out for support!*