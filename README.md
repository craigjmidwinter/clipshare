# [Clipshare](https://github.com/craigjmidwinter/clipshare)

[![GitHub Stars](https://img.shields.io/github/stars/craigjmidwinter/clipshare.svg?color=blue&labelColor=555555&logoColor=ffffff&style=for-the-badge&logo=github)](https://github.com/craigjmidwinter/clipshare)
[![GitHub Release](https://img.shields.io/github/release/craigjmidwinter/clipshare.svg?color=blue&labelColor=555555&logoColor=ffffff&style=for-the-badge&logo=github)](https://github.com/craigjmidwinter/clipshare/releases)

[Clipshare](https://github.com/craigjmidwinter/clipshare) is a professional video collaboration platform with Plex integration for teams, content creators, and live production workflows.

[![clipshare](https://img.shields.io/badge/Clipshare-Video_Collaboration-blue?style=for-the-badge&logo=video)](https://github.com/craigjmidwinter/clipshare)

Clipshare enables teams to collaborate on video content directly from Plex media libraries, create frame-accurate bookmarks, and generate professional OBS packages for live streaming and recording.

## Supported Platforms

Clipshare is built with Next.js and supports multiple deployment options:

| Platform | Available | Description |
| :----: | :----: |--- |
| Web Application | ✅ | Browser-based interface for all features |
| Docker | ✅ | Containerized deployment with Docker Compose |
| Node.js | ✅ | Direct Node.js deployment on servers |

## Application Setup

Access the web interface at `http://localhost:3000` after starting the application. Configure your Plex server connection in the admin setup wizard on first launch.

For detailed setup instructions, see the **[Getting Started Guide](./docs/GETTING_STARTED.md)**.

## Quick Start

>[!NOTE]
>For development setup, see the **[Developer Documentation](./DEVELOPERS.md)**.

### Using Docker (Recommended)

```yaml
---
services:
  clipshare:
    build: .
    container_name: clipshare
    environment:
      - PLEX_CLIENT_ID=your-client-id
      - NEXTAUTH_SECRET=your-secret-key
    ports:
      - 3000:3000
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/craigjmidwinter/clipshare.git
cd clipshare/web

# Install dependencies
npm install

# Set up environment variables
cp env.example .env.local
# Edit .env.local with your configuration

# Start the application
npm run dev
```

## ✨ Key Features
### 🎬 **Video Collaboration**
- **Frame-accurate bookmarking** with millisecond precision
- **Public and private notes** for team communication and personal workflow
- **Producer and collaborator roles** with appropriate permissions

### 📹 **Professional Video Workflows**
- **Direct Plex integration** - Work with existing media libraries without duplication
- **HLS streaming** for smooth web-based video playback
- **High-quality clip generation** in multiple formats and resolutions
- **Batch processing** for efficient workflow management

### 📺 **OBS Studio Integration**
- **One-click OBS package export** with automated setup scripts
- **VTR-style clip triggering** via hotkeys during live production
- **Professional scene collection generation** with pre-configured sources
- **Web-based control interface** for visual clip management

### 👥 **Team Management**
- **Workspace-based organization** around specific video content
- **Real-time synchronization** of changes across all team members
- **Granular permissions** and access control
- **Seamless onboarding** through Plex authentication

## Configuration

Configure Clipshare through environment variables in `.env.local`:

| Parameter | Function |
| :----: | --- |
| `NEXTAUTH_URL` | Base URL for the application (e.g., `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Secret key for authentication sessions |
| `PLEX_CLIENT_ID` | Plex client ID for authentication |
| `PLEX_SERVER_URL` | Your Plex server URL (optional, can be set via UI) |
| `PLEX_SERVER_TOKEN` | Your Plex server token (optional, can be set via UI) |
| `DATABASE_URL` | Database connection string (defaults to SQLite) |

## Environment Variables from Files

You can set any environment variable from a file by using a special prepend `FILE__`.

As an example:

```bash
FILE__NEXTAUTH_SECRET=/run/secrets/myauthsecret
```

Will set the `NEXTAUTH_SECRET` environment variable based on the contents of the `/run/secrets/myauthsecret` file.

## Support Info

* **Getting Started**: [User Guide](./docs/GETTING_STARTED.md) for new users
* **Complete Manual**: [User Guide](./docs/USER_GUIDE.md) for comprehensive workflows  
* **OBS Integration**: [OBS Guide](./docs/OBS_INTEGRATION.md) for live production setup
* **FAQ**: [Frequently Asked Questions](./docs/FAQ.md) for common issues
* **Developer Setup**: [Developer Documentation](./DEVELOPERS.md) for technical setup

* Access application logs (Docker):

    ```bash
    docker logs -f clipshare
    ```

* Access application logs (Node.js):

    ```bash
    npm run dev
    # Check console output
    ```

* Check application version:

    ```bash
    # View package.json version
    cat web/package.json | grep version
    ```

## Updates and Maintenance

### Updating the Application

* **Pull latest changes**:

    ```bash
    git pull origin main
    cd web
    npm install
    ```

* **Database migrations**:

    ```bash
    npx prisma db push
    ```

* **Restart the application**:

    ```bash
    npm run dev
    ```

### Via Docker

* **Update and restart**:

    ```bash
    docker-compose pull
    docker-compose up -d
    ```

* **Remove old images**:

    ```bash
    docker image prune
    ```

## Use Cases

### **Content Creation Teams**
- Review and annotate video content collaboratively
- Create highlight reels and clips for social media
- Manage feedback and approval workflows
- Generate downloadable clips in multiple formats

### **Live Streaming and Broadcasting**
- Create professional VTR (Video Tape Recorder) workflows
- Trigger clips instantly during live broadcasts
- Manage clip libraries for recurring shows
- Integrate seamlessly with OBS Studio setups

### **Educational and Training**
- Collaborative video review for training materials
- Create timestamped learning resources
- Generate clip packages for different audiences
- Streamline content creation workflows

### **Corporate Communications**
- Review and approve company video content
- Create clip libraries for presentations
- Collaborate on marketing and communication materials
- Generate professional broadcast packages

## Building Locally

If you want to make local modifications to Clipshare for development purposes:

```bash
git clone https://github.com/craigjmidwinter/clipshare.git
cd clipshare/web
npm install
npm run build
```

For complete development setup, see the **[Developer Documentation](./DEVELOPERS.md)**.

## Documentation

* **[📚 Complete Documentation](./docs/README.md)** - Full documentation index
* **[👨‍💻 Developer Guide](./DEVELOPERS.md)** - Technical setup and contribution guide
* **[🚀 Getting Started](./docs/GETTING_STARTED.md)** - Quick start for new users
* **[📖 User Manual](./docs/USER_GUIDE.md)** - Comprehensive user guide
* **[🎬 OBS Integration](./docs/OBS_INTEGRATION.md)** - Live production setup

## Versions

* **v0.3.2** - Latest stable release with core collaboration features
* **main** - Development branch with latest features and fixes

For detailed version history, see [GitHub Releases](https://github.com/craigjmidwinter/clipshare/releases).

## License

Private project for internal use.

---

**🎬 Ready to start collaborating on video content with your team?**

**[Get Started Now →](./docs/GETTING_STARTED.md)** | **[Developer Setup →](./DEVELOPERS.md)**