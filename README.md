# Clipshare

**Professional video collaboration platform with Plex integration for teams, content creators, and live production workflows.**

Clipshare enables teams to collaborate on video content directly from Plex media libraries, create frame-accurate bookmarks, and generate professional OBS packages for live streaming and recording.

## ✨ Key Features

### 🎬 **Video Collaboration**
- **Real-time collaboration** on video content with team members
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

## 🚀 Quick Start

### For Users
1. **[Getting Started Guide](./docs/GETTING_STARTED.md)** - 5-minute setup for new users
2. **[User Guide](./docs/USER_GUIDE.md)** - Complete user manual and workflows
3. **[OBS Integration Guide](./docs/OBS_INTEGRATION.md)** - Professional live production setup

### For Developers
1. **[Development Guide](./docs/DEVELOPMENT.md)** - Complete development environment setup
2. **[API Reference](./docs/API.md)** - REST API documentation with examples
3. **[Testing Guide](./docs/TESTING.md)** - Testing strategies and best practices

### For System Administrators
1. **[Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment options
2. **[Architecture Guide](./docs/ARCHITECTURE.md)** - Technical architecture deep dive
3. **[Troubleshooting Guide](./docs/TROUBLESHOOTING.md)** - Common issues and solutions

## 🐳 Docker Deployment

The easiest way to run Clipshare is with Docker:

```bash
# Clone and setup
git clone https://github.com/craigjmidwinter/clipshare.git
cd clipshare

# Setup data directories with correct permissions
./setup-data-dirs.sh

# Start the application
docker compose up -d
```

Then open http://localhost:3000 and follow the welcome wizard to configure your Plex server.

**For production**, set a secure `NEXTAUTH_SECRET`:

```bash
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)" > .env
docker compose up -d
```

All data is stored in the `./data` directory for easy backup and migration.

## 📖 Documentation

### **Complete Documentation Library**
Our comprehensive documentation covers every aspect of Clipshare:

| Documentation | Description |
|---------------|-------------|
| **[📚 Documentation Index](./docs/README.md)** | Complete guide to all documentation |
| **[🚀 Getting Started](./docs/GETTING_STARTED.md)** | Quick start guide for new users |
| **[📖 User Guide](./docs/USER_GUIDE.md)** | Comprehensive user manual |
| **[🎬 OBS Integration](./docs/OBS_INTEGRATION.md)** | Professional live production setup |
| **[❓ FAQ](./docs/FAQ.md)** | Frequently asked questions |
| **[🛠️ Development](./docs/DEVELOPMENT.md)** | Developer setup and workflows |
| **[🔌 API Reference](./docs/API.md)** | Complete REST API documentation |
| **[🧪 Testing](./docs/TESTING.md)** | Testing strategies and guidelines |
| **[🏗️ Architecture](./docs/ARCHITECTURE.md)** | Technical architecture guide |
| **[🚀 Deployment](./docs/DEPLOYMENT.md)** | Production deployment guide |
| **[🔧 Troubleshooting](./docs/TROUBLESHOOTING.md)** | Common issues and solutions |

### **Legacy Documentation**
- **[VERSIONING.md](./VERSIONING.md)** - Automatic versioning system details
- **[docs/stories.md](./docs/stories.md)** - Product requirements and user stories
- **[docs/localdev.md](./docs/localdev.md)** - Local development setup

## 🛠️ Technology Stack

### **Frontend**
- **Next.js 15.5.3** with App Router and React Server Components
- **TypeScript** for type safety and developer experience
- **Tailwind CSS** for modern, responsive styling
- **React Testing Library** for component testing

### **Backend**
- **Next.js API Routes** for backend functionality
- **Prisma ORM** with SQLite for database operations
- **NextAuth.js** with Plex OAuth integration
- **Background job processing** for video operations

### **Integration**
- **Plex Media Server** for content source and authentication
- **FFmpeg** for video processing and clip generation
- **OBS Studio** integration for live production workflows
- **HLS streaming** for web-based video playback

## 🔧 Quick Development Setup

```bash
# Clone and navigate to web directory
git clone https://github.com/yourusername/clipshare.git
cd clipshare/web

# Install dependencies (takes ~1-2 minutes)
npm install

# Set up environment variables
cp env.example .env.local
# Edit .env.local with your Plex server details

# Initialize database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

**📖 For complete setup instructions, see [Development Guide](./docs/DEVELOPMENT.md)**

## 🎯 Use Cases

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

## 🔄 Automatic Versioning

This project uses **automatic semantic versioning** based on conventional commit messages:

- `feat: new feature` → **minor** version bump (1.0.0 → 1.1.0)
- `fix: bug fix` → **patch** version bump (1.0.0 → 1.0.1)  
- `feat!: breaking change` → **major** version bump (1.0.0 → 2.0.0)

When you push to the `main` branch, GitHub Actions automatically:
- Analyzes commit messages to determine version bump type
- Updates the version in `web/package.json`
- Creates git tags and GitHub releases

**📖 For complete versioning details, see [VERSIONING.md](./VERSIONING.md)**

## 🤝 Contributing

We welcome contributions to Clipshare! Please see our documentation for contribution guidelines:

1. **[Development Guide](./docs/DEVELOPMENT.md)** - Setup and development workflows
2. **[Testing Guide](./docs/TESTING.md)** - Testing requirements and practices
3. **[Architecture Guide](./docs/ARCHITECTURE.md)** - Understanding the codebase

### **Quick Contribution Checklist**
- ✅ Follow conventional commit message format
- ✅ Include tests for new features
- ✅ Update documentation as needed
- ✅ Ensure all tests pass
- ✅ Follow existing code style and patterns

## 📞 Support

### **Getting Help**
1. **[FAQ](./docs/FAQ.md)** - Common questions and quick answers
2. **[Troubleshooting Guide](./docs/TROUBLESHOOTING.md)** - Detailed problem solving
3. **[GitHub Issues](https://github.com/yourusername/clipshare/issues)** - Bug reports and feature requests
4. **Documentation** - Comprehensive guides for all aspects

### **Reporting Issues**
When reporting issues, please include:
- Operating system and browser details
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots or error messages
- Relevant log files

## 📄 License

Private project for internal use.

---

**🎬 Ready to start collaborating on video content with your team?**

**[Get Started Now →](./docs/GETTING_STARTED.md)**