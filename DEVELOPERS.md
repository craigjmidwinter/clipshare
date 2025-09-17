# Clipshare Developer Documentation

**Comprehensive guide for developers working on Clipshare - the professional video collaboration platform with Plex integration.**

This document covers everything you need to know to develop, test, and deploy Clipshare.

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

## 🚀 Quick Development Setup

```bash
# Clone and navigate to web directory
git clone https://github.com/craigjmidwinter/clipshare.git
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

## 📖 Developer Documentation

### **Core Development Guides**
| Documentation | Description |
|---------------|-------------|
| **[🛠️ Development Setup](./docs/DEVELOPMENT.md)** | Complete development environment setup |
| **[🔌 API Reference](./docs/API.md)** | Complete REST API documentation |
| **[🧪 Testing Guide](./docs/TESTING.md)** | Testing strategies and guidelines |
| **[🏗️ Architecture Guide](./docs/ARCHITECTURE.md)** | Technical architecture guide |
| **[🚀 Deployment Guide](./docs/DEPLOYMENT.md)** | Production deployment guide |
| **[🔧 Troubleshooting](./docs/TROUBLESHOOTING.md)** | Common issues and solutions |

### **Legacy Developer Documentation**
- **[VERSIONING.md](./VERSIONING.md)** - Automatic versioning system details
- **[docs/stories.md](./docs/stories.md)** - Product requirements and user stories
- **[docs/localdev.md](./docs/localdev.md)** - Local development setup

## 🔍 Development Workflows

### For Developers
1. **[Development Guide](./docs/DEVELOPMENT.md)** - Complete development environment setup
2. **[API Reference](./docs/API.md)** - REST API documentation with examples
3. **[Testing Guide](./docs/TESTING.md)** - Testing strategies and best practices

### For System Administrators
1. **[Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment options
2. **[Architecture Guide](./docs/ARCHITECTURE.md)** - Technical architecture deep dive
3. **[Troubleshooting Guide](./docs/TROUBLESHOOTING.md)** - Common issues and solutions

## 📞 Developer Support

### **Getting Help**
1. **[Troubleshooting Guide](./docs/TROUBLESHOOTING.md)** - Detailed problem solving
2. **[GitHub Issues](https://github.com/craigjmidwinter/clipshare/issues)** - Bug reports and feature requests
3. **[Architecture Guide](./docs/ARCHITECTURE.md)** - Understanding technical decisions

### **Reporting Issues**
When reporting development issues, please include:
- Development environment details (Node.js version, OS, etc.)
- Steps to reproduce the issue
- Expected vs actual behavior
- Console errors or logs
- Relevant configuration files

## 📄 License

Private project for internal use.

---

**🛠️ Ready to start developing Clipshare?**

**[Get Started with Development →](./docs/DEVELOPMENT.md)**