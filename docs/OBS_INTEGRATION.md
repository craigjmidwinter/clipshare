# OBS Integration Guide

Complete guide to using Clipshare's OBS Studio integration for professional live production workflows.

## 📖 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Preparing Your Workspace](#preparing-your-workspace)
4. [Exporting OBS Packages](#exporting-obs-packages)
5. [Setting Up OBS Studio](#setting-up-obs-studio)
6. [Live Production Workflow](#live-production-workflow)
7. [Advanced Features](#advanced-features)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

## Overview

Clipshare's OBS integration transforms your bookmarked clips into a professional Video Tape Recorder (VTR) system for live streaming and recording. This allows you to trigger pre-prepared clips instantly during live broadcasts using hotkeys or a visual control interface.

### What You Get

**📦 Complete OBS Package:**
- Individual MP4 files for each bookmark
- Pre-configured OBS scene collection
- Automated hotkey mappings (F1-F12, etc.)
- Web-based control interface
- One-click setup scripts
- Comprehensive documentation

**🎬 Professional Features:**
- Instant clip triggering during live production
- Visual control panel for monitoring
- Customizable hotkey patterns
- Multiple quality/format options
- Web interface for external control
- Automated scene and source creation

## Prerequisites

### Software Requirements
- **OBS Studio 28.0+** (recommended: latest version)
- **Python 3.7+** (for automated setup scripts)
- **Modern web browser** (for web interface)
- **Clipshare workspace** with completed bookmarks

### System Requirements
- **Operating System**: Windows 10+, macOS 10.15+, or Linux
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 2GB+ free space for clips and OBS files
- **Network**: Stable internet connection for package download

### Clipshare Requirements
- **Completed workspace** with processed content
- **Finalized bookmarks** from all collaborators
- **Producer permissions** to export OBS packages
- **Processed workspace** (background processing complete)

## Preparing Your Workspace

### 1. Finalize All Bookmarks

Before exporting, ensure all team bookmarks are complete:

**Review Process:**
1. **Check all bookmarks** have proper in/out points
2. **Verify descriptions** are clear and descriptive
3. **Lock important bookmarks** to prevent changes
4. **Test playback** of each bookmark
5. **Remove unwanted bookmarks** or test clips

**Quality Control:**
```
✅ All bookmarks have descriptive names
✅ In/out points are frame-accurate
✅ No overlapping or duplicate clips
✅ Audio levels are consistent
✅ Clips are relevant to production needs
```

### 2. Organize Bookmark Structure

**Naming Conventions:**
- Use consistent, descriptive names
- Include sequence numbers if needed
- Consider hotkey mapping (F1-F12 correspond to first 12 clips)
- Group related clips logically

**Example Organization:**
```
01_Opening_Sequence
02_Welcome_Message
03_Product_Demo_Part1
04_Product_Demo_Part2
05_Customer_Testimonial
06_Q_and_A_Section
07_Live_Demo_Reaction
08_Closing_Remarks
```

### 3. Test Workspace Processing

Ensure your workspace is fully processed:

1. **Check processing status** in workspace dashboard
2. **Verify HLS streams** work correctly
3. **Test individual clip downloads** 
4. **Confirm no processing errors**

**Processing Status Indicators:**
- ✅ **Complete** - Ready for OBS export
- 🔄 **Processing** - Wait for completion
- ❌ **Error** - Resolve issues before export

## Exporting OBS Packages

### 1. Initiate Export

From your processed workspace:

1. **Click "Export for OBS"** button in workspace header
2. **Review export prerequisites** checklist
3. **Proceed to package configuration**

### 2. Configure Export Settings

**Package Settings:**
- **Export Format**: MP4 (H.264) recommended for compatibility
- **Quality**: 1080p for high-quality production, 720p for smaller files
- **Audio**: Include original audio tracks
- **File Naming**: Sequential or timestamp-based

**Clip Selection:**
- **All Bookmarks** (default) - Include every bookmark
- **Selected Bookmarks** - Choose specific clips
- **Collaborator Filter** - Include/exclude by creator
- **Time Range** - Export clips within specific timeframe

**OBS Configuration:**
- **Hotkey Pattern**: 
  - Sequential (F1-F12, Ctrl+F1-F12...)
  - Creator-based grouping
  - Custom key assignments
- **Scene Names**: Descriptive or numbered
- **Source Naming**: Consistent with bookmark labels

**Web Interface:**
- **Enable Web Control** (recommended)
- **Theme**: Dark/Light for your streaming environment
- **Port**: 8080 (default) or custom
- **Password Protection**: Enable for security

### 3. Generate Package

1. **Review settings** and click "Generate Package"
2. **Monitor progress** - Processing time depends on clip count and quality
3. **Download ZIP file** when generation completes
4. **Verify package contents** before OBS setup

**Expected Processing Time:**
- 1-5 clips: 1-2 minutes
- 6-15 clips: 3-8 minutes  
- 16+ clips: 10+ minutes

## Setting Up OBS Studio

### Automated Setup (Recommended)

**1. Extract Package:**
```bash
# Extract to dedicated folder
mkdir clipshare_obs_package
unzip workspace_obs_package.zip -d clipshare_obs_package/
cd clipshare_obs_package/
```

**2. Run Setup Script:**

**Windows:**
```cmd
setup_obs.bat
```

**Mac/Linux:**
```bash
chmod +x setup_obs.sh
./setup_obs.sh
```

**3. Verify Installation:**
- OBS Studio launches automatically
- Scene collection "Clipshare_VTR" is loaded
- All clip sources are configured
- Hotkeys are mapped
- WebSocket is enabled

### Manual Setup (Advanced)

If automated setup fails, configure manually:

**1. Import Scene Collection:**
1. Open OBS Studio
2. Go to Scene Collection → Import
3. Select `obs_scene_collection.json` from package
4. Switch to imported collection

**2. Configure Media Sources:**
1. Each bookmark becomes a media source
2. Sources are pre-configured but verify paths
3. Adjust source properties if needed
4. Test each source plays correctly

**3. Set Up Hotkeys:**
1. Go to File → Settings → Hotkeys
2. Import hotkey configuration from package
3. Or manually assign keys to each source:
   - F1: Restart first clip
   - F2: Restart second clip
   - etc.

**4. Enable WebSocket (Optional):**
1. Go to Tools → WebSocket Server Settings
2. Enable server on port 4455
3. Set password: `clipshare_vtr`
4. Configure for external control access

### Package Contents Explained

**Generated Files:**
```
workspace_obs_package/
├── clips/                     # Individual MP4 files
│   ├── 01_opening_sequence.mp4
│   ├── 02_welcome_message.mp4
│   └── ...
├── obs_scene_collection.json  # OBS scenes and sources
├── hotkey_config.json        # Hotkey mappings
├── web_interface/            # Browser control panel
│   ├── index.html
│   ├── control.js
│   └── styles.css
├── setup_obs.bat            # Windows setup script
├── setup_obs.sh             # Mac/Linux setup script
├── README.md                # Setup instructions
└── troubleshooting.md       # Common issues
```

**OBS Scenes Created:**
- **Main Scene**: Clean output for streaming/recording
- **VTR Control Scene**: Control panel view (for monitoring)

## Live Production Workflow

### Pre-Production Setup

**1. Test Everything:**
```
✅ All clips play correctly in OBS
✅ Hotkeys trigger appropriate clips
✅ Audio levels are consistent
✅ Scenes switch properly
✅ Web interface connects (if used)
✅ Backup plans are ready
```

**2. Prepare Production Environment:**
- Close unnecessary applications
- Ensure stable internet connection
- Test streaming/recording settings
- Have clip list readily available
- Prepare backup content

### During Live Production

**1. Using Hotkeys:**
- **F1-F12**: Trigger first 12 clips
- **Ctrl+F1-F12**: Trigger clips 13-24
- **Alt+F1-F12**: Trigger clips 25-36
- **Custom keys**: As configured in export

**2. Using Web Interface:**
- Open browser to `http://localhost:8080`
- Click clip buttons to trigger
- Monitor playback status
- Use search/filter for large clip libraries

**3. Best Practices During Live:**
- **Test clips before going live**
- **Have backup content ready**
- **Monitor audio levels continuously**
- **Use preview mode when possible**
- **Keep clip list visible for reference**

### VTR Operation

**Clip Triggering:**
1. **Press hotkey** or click web button
2. **Clip restarts from beginning** (VTR behavior)
3. **Previous clip stops** automatically
4. **Audio crossfade** (if configured)

**Scene Management:**
- **Main Scene**: Clean feed for audience
- **Control Scene**: Producer monitoring view
- **Switch between scenes** as needed
- **Picture-in-picture** options available

## Advanced Features

### Custom Hotkey Patterns

**Sequential Pattern (Default):**
```
F1-F12:     Clips 1-12
Ctrl+F1-F12: Clips 13-24
Alt+F1-F12:  Clips 25-36
```

**Creator-Based Pattern:**
```
F1-F4:    Producer clips
F5-F8:    Collaborator A clips
F9-F12:   Collaborator B clips
```

**Category-Based Pattern:**
```
F1-F3:    Opening segments
F4-F6:    Main content
F7-F9:    Reactions/responses
F10-F12:  Closing segments
```

### Web Interface Features

**Control Panel:**
- Visual clip buttons with thumbnails
- Real-time playback status
- Search and filter capabilities
- Volume and playback controls
- Scene switching controls

**Remote Access:**
- Access from any device on network
- Mobile-friendly responsive design
- Password protection available
- WebSocket real-time updates

**Monitoring:**
- Live playback status
- Clip duration and remaining time
- Audio level indicators
- Connection status monitoring

### Integration with Streaming Tools

**Stream Deck Integration:**
- Configure Stream Deck buttons to trigger hotkeys
- Visual feedback with clip thumbnails
- Multi-action sequences possible
- Custom icons for each clip

**External Control:**
- WebSocket API for custom integrations
- REST API endpoints for automation
- MIDI controller support
- Third-party software integration

## Troubleshooting

### Common Setup Issues

**❌ OBS Scene Collection Not Loading:**
```
Solution:
1. Verify OBS Studio version (28.0+ required)
2. Check file permissions on package contents
3. Manually import scene collection
4. Restart OBS Studio
```

**❌ Clips Not Playing:**
```
Solution:
1. Verify media file paths in source properties
2. Check video codec compatibility
3. Update OBS Studio to latest version
4. Re-run setup script with administrator privileges
```

**❌ Hotkeys Not Working:**
```
Solution:
1. Check for hotkey conflicts in OBS settings
2. Verify hotkey import was successful
3. Manually configure problematic keys
4. Test hotkeys in OBS hotkey settings
```

**❌ Web Interface Not Accessible:**
```
Solution:
1. Check firewall settings (port 8080)
2. Verify WebSocket plugin is enabled
3. Try different port in configuration
4. Check browser console for errors
```

### Performance Issues

**🐌 Slow Clip Loading:**
- Reduce clip quality/resolution
- Use SSD storage for clip files
- Close unnecessary applications
- Increase OBS memory allocation

**🔊 Audio Sync Issues:**
- Check audio device settings
- Verify consistent sample rates
- Use audio monitoring
- Adjust audio delay if needed

**📺 Dropped Frames:**
- Lower streaming/recording quality
- Check CPU usage and cooling
- Use hardware encoding if available
- Reduce number of active sources

### Recovery Procedures

**Backup Plans:**
1. **Manual Clip Triggering**: Use OBS source visibility toggles
2. **File Browser Method**: Drag clips manually to sources
3. **Alternative Software**: Use media player as backup
4. **Static Fallback**: Prepare static images/videos

**Emergency Procedures:**
1. **Stream continues with current scene**
2. **Switch to backup content immediately**
3. **Fix issues during commercial breaks**
4. **Post-production editing if necessary**

## Best Practices

### Pre-Production Planning

**Content Strategy:**
- Plan clip usage in advance
- Create shot list with hotkey references
- Practice transitions and timing
- Prepare backup content
- Test full workflow before going live

**Technical Preparation:**
- Export packages well before production
- Test on production hardware
- Verify all connections and settings
- Have technical support contacts ready
- Document custom configurations

### Production Excellence

**Clip Management:**
- Use descriptive, memorable names
- Organize clips by usage frequency
- Keep frequently used clips on F1-F6
- Group related content logically
- Prepare alternate versions when possible

**Quality Control:**
- Test every clip before production
- Monitor audio levels consistently
- Check video quality and framing
- Verify timing and pacing
- Have quality backup options

**Team Coordination:**
- Share hotkey assignments with team
- Designate clip trigger responsibility
- Communicate timing and cues clearly
- Practice with full production team
- Establish emergency procedures

### Long-term Maintenance

**Content Updates:**
- Regularly refresh clip libraries
- Archive outdated content
- Update based on performance feedback
- Maintain consistent quality standards
- Document successful configurations

**Technical Maintenance:**
- Keep OBS Studio updated
- Regularly test setup procedures
- Monitor system performance
- Update documentation as needed
- Train backup operators

## Advanced Integrations

### Professional Workflows

**Multi-Camera Productions:**
- Integrate clips with camera switching
- Sync timing across multiple sources
- Use preview/program workflow
- Coordinate with video production team

**Live Event Management:**
- Schedule clip usage with rundowns
- Integrate with event management systems
- Coordinate with audio engineers
- Plan for audience interaction

**Corporate Communications:**
- Brand consistency across clips
- Legal/compliance review workflows
- Multi-language content preparation
- Archive and asset management

### Technical Extensions

**Custom Development:**
- API integration for automated workflows
- Custom web interface modifications
- Integration with existing production tools
- Automated content generation

**Enterprise Features:**
- Central content management
- User permission and access control
- Usage analytics and reporting
- Multi-workspace coordination

---

**Related Documentation:**
- [User Guide](./USER_GUIDE.md) - Basic Clipshare usage
- [API Reference](./API.md) - Technical integration
- [Troubleshooting](./TROUBLESHOOTING.md) - General issue resolution

**Support Resources:**
- OBS Studio documentation
- Video production best practices
- Live streaming guides
- Professional broadcast workflows

*Ready to create professional live productions with Clipshare! 🎬📺*