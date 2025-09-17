# Automatic Versioning

This repository uses automatic semantic versioning based on commit messages when pushing to the `main` branch.

## How It Works

The GitHub Actions workflow (`.github/workflows/version.yml`) automatically:

1. **Analyzes commit messages** since the last tag to determine the version bump type
2. **Updates the version** in `web/package.json`
3. **Creates a git tag** with the new version
4. **Creates a GitHub release** with release notes

## Version Bump Rules

The version bump is determined by analyzing commit messages:

- **Major version bump** (e.g., 1.0.0 → 2.0.0): 
  - Commits containing `BREAKING CHANGE` in the message
  - Commits with `!` after the type (e.g., `feat!:`, `fix!:`)

- **Minor version bump** (e.g., 1.0.0 → 1.1.0):
  - Commits starting with `feat:` or `feature:`

- **Patch version bump** (e.g., 1.0.0 → 1.0.1):
  - Commits starting with `fix:` or `bugfix:`
  - Any other commits (default behavior)

## Commit Message Examples

```bash
# Patch bump
git commit -m "fix: resolve authentication issue"
git commit -m "bugfix: fix video export format"
git commit -m "docs: update installation guide"

# Minor bump  
git commit -m "feat: add OBS integration"
git commit -m "feature: implement automatic clip generation"

# Major bump
git commit -m "feat!: completely rewrite video processing"
git commit -m "fix: remove deprecated API

BREAKING CHANGE: The old API endpoints have been removed"
```

## Manual Version Control

If you need to skip automatic versioning for a commit, start your commit message with `bump:`:

```bash
git commit -m "bump: version 1.2.3"
```

## Current Version

The current version is tracked in `web/package.json` and can be checked with:

```bash
cd web
npm version
```

## Workflow Permissions

The workflow requires the `GITHUB_TOKEN` to have write permissions to:
- Repository contents (to push commits and tags)
- Repository releases (to create releases)

These permissions are automatically available in GitHub Actions when using the default `GITHUB_TOKEN`.