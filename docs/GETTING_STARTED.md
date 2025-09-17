# Getting Started with Clipshare

This guide will help you get up and running with Clipshare quickly, whether you're a content creator, producer, or collaborator.

## What is Clipshare?

Clipshare is an internal video collaboration tool that integrates with your Plex media server to enable teams to:

- 🎬 **Create workspaces** around TV episodes or movies from your Plex library
- 📌 **Bookmark moments** with precise in/out points and collaborative notes
- 🎥 **Generate clips** for download and sharing
- 📺 **Export OBS packages** for live production workflows
- 👥 **Collaborate in real-time** with team members

## Prerequisites

Before you begin, ensure you have:

- ✅ **Plex Media Server** running (locally or remotely)
- ✅ **Plex account** with access to the media server
- ✅ **Modern web browser** (Chrome, Firefox, Safari, Edge)
- ✅ **Basic Plex knowledge** (how to navigate your library)

## Quick Start (5 minutes)

### Step 1: Access Clipshare

1. Navigate to your Clipshare instance (e.g., `http://localhost:3000`)
2. You'll see the login page with Plex authentication

### Step 2: Sign In with Plex

1. Click **"Sign in with Plex"**
2. You'll be redirected to Plex.tv for authentication
3. Enter your Plex credentials and authorize Clipshare
4. Return to Clipshare automatically after authorization

### Step 3: Complete Onboarding (First-time users)

If this is your first time, you'll go through a welcome wizard:

1. **Welcome Screen**: Overview of Clipshare's features
2. **Plex Configuration**: 
   - Enter your Plex server URL (e.g., `http://192.168.1.100:32400`)
   - Provide your Plex server token (from Plex settings)
3. **Library Test**: Verify connection and view available libraries
4. **Ready to Collaborate**: Complete setup confirmation

> **💡 Getting Your Plex Server Token:**
> 1. Open Plex Web App → Settings → Network
> 2. Look for "Plex Token" in the advanced settings
> 3. Copy the long string of characters

### Step 4: Create Your First Workspace

1. From the **Workspaces Dashboard**, click **"Create Workspace"**
2. **Browse Plex Content**:
   - Select a library (Movies, TV Shows, etc.)
   - Choose an episode or movie
3. **Workspace Setup**:
   - Give your workspace a descriptive name
   - Add a description (optional)
   - Invite collaborators by email (optional)
4. Click **"Create Workspace"**

### Step 5: Start Collaborating

Once in your workspace:

1. **Watch the content** using the built-in video player
2. **Create bookmarks**:
   - Click where you want to start a clip
   - Use the bookmark button or press `B`
   - Set the end point by clicking again
   - Add notes (public or private)
3. **Collaborate**:
   - See bookmarks from other team members in real-time
   - Add comments and feedback
   - Lock bookmarks when finalizing

## User Roles Explained

### 🎬 Producer
- **Creates workspaces** and manages settings
- **Invites collaborators** and manages permissions
- **Exports final packages** for OBS or download
- **Full control** over workspace content

### 👥 Collaborator  
- **Creates bookmarks** and adds notes
- **Views all public bookmarks** from team members
- **Downloads individual clips** 
- **Cannot modify** workspace settings

## Key Concepts

### Workspaces
- A workspace is built around **one piece of content** (episode/movie)
- Contains **all bookmarks** from all collaborators
- Has **one producer** and multiple collaborators
- Can be **processed** to generate downloadable clips

### Bookmarks
- **Precise timestamps** with in/out points
- **Two types of notes**: Public (visible to all) and Private (personal)
- **Real-time collaboration** - see changes instantly
- **Can be locked** to prevent further editing

### Processing
- **Background job** that analyzes the source content
- **Generates HLS streams** for web playback
- **Creates downloadable clips** in MP4 format
- **Required before** clip downloads or OBS export

## Basic Workflows

### Creating a Simple Clip

1. **Open workspace** with your desired content
2. **Navigate to timestamp** where you want the clip to start
3. **Click "Add Bookmark"** or press `B`
4. **Set end point** by clicking the timeline again
5. **Add description** and notes
6. **Save bookmark**
7. **Download clip** once processing is complete

### Collaborative Review Session

1. **Producer creates workspace** and invites team
2. **Team members join** and watch content together
3. **Everyone creates bookmarks** at interesting moments
4. **Add feedback** using public notes
5. **Producer reviews** all bookmarks and feedback
6. **Lock finalized bookmarks** to prevent changes
7. **Export final package** for production use

### OBS Live Production Setup

1. **Complete all bookmarks** in workspace
2. **Process workspace** to generate clips
3. **Export OBS package** with custom settings
4. **Download and extract** the ZIP package
5. **Run setup script** to configure OBS automatically
6. **Go live** with instant clip access via hotkeys

## Next Steps

Now that you're set up, explore these advanced features:

- 📖 **[User Guide](./USER_GUIDE.md)** - Detailed workflows and features
- 🎬 **[OBS Integration](./OBS_INTEGRATION.md)** - Professional live production setup
- ❓ **[FAQ](./FAQ.md)** - Common questions and solutions

## Getting Help

- **Can't connect to Plex?** → Check [Troubleshooting Guide](./TROUBLESHOOTING.md)
- **Workspace not processing?** → Verify your Plex server is accessible
- **Video won't play?** → Ensure your Plex content is optimized for streaming
- **Need help with OBS?** → See the [OBS Integration Guide](./OBS_INTEGRATION.md)

## Tips for Success

💡 **Pro Tips:**
- Use **descriptive bookmark names** for easier organization
- **Add timestamps in notes** for quick reference
- **Process workspaces early** to catch any content issues
- **Test OBS packages** before going live
- **Use private notes** for personal reminders
- **Lock important bookmarks** to prevent accidental changes

Welcome to Clipshare! 🎉