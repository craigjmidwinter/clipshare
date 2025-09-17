# Clipshare

Internal video collaboration tool for working with Plex libraries.

## Features

- **Video Collaboration**: Create workspaces for video projects with bookmark/clip functionality
- **OBS Integration**: Export clips packages for live production with OBS Studio
- **VTR Control**: Professional video tape recorder functionality for live streaming
- **Plex Integration**: Direct integration with Plex media servers

## Development

See the [web/README.md](./web/README.md) for detailed development setup instructions.

### Quick Start

```bash
# Install dependencies
cd web
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

## Versioning

This project uses **automatic semantic versioning** based on commit messages. When you push to the `main` branch, a GitHub Actions workflow automatically:

- Analyzes commit messages to determine version bump type
- Updates the version in `web/package.json`
- Creates git tags and GitHub releases

### Commit Message Format

Use conventional commit messages to control versioning:

- `feat: new feature` → **minor** version bump (1.0.0 → 1.1.0)
- `fix: bug fix` → **patch** version bump (1.0.0 → 1.0.1)  
- `feat!: breaking change` → **major** version bump (1.0.0 → 2.0.0)

For detailed versioning information, see [VERSIONING.md](./VERSIONING.md).

**⚠️ Important**: All commits must follow conventional commit format. Commit messages are automatically validated on pull requests.

## Documentation

- [VERSIONING.md](./VERSIONING.md) - Automatic versioning system details
- [COMMIT_LINT.md](./COMMIT_LINT.md) - Commit message format and linting setup
- [docs/stories.md](./docs/stories.md) - Product requirements and user stories

## License

Private project for internal use.