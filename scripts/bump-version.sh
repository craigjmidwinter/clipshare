#!/bin/bash

# Manual version bump script for testing
# Usage: ./scripts/bump-version.sh [major|minor|patch]

set -e

BUMP_TYPE=${1:-patch}

if [[ ! "$BUMP_TYPE" =~ ^(major|minor|patch)$ ]]; then
    echo "Error: Invalid bump type '$BUMP_TYPE'. Use major, minor, or patch."
    exit 1
fi

echo "🔍 Current version:"
cd web
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "  $CURRENT_VERSION"

echo ""
echo "📈 Bumping $BUMP_TYPE version..."
NEW_VERSION=$(npm version $BUMP_TYPE --no-git-tag-version)
NEW_VERSION=${NEW_VERSION#v}  # Remove 'v' prefix

echo "✅ Version bumped from $CURRENT_VERSION to $NEW_VERSION"

echo ""
echo "🏷️  Creating git tag..."
cd ..
git add web/package.json
git commit -m "bump: version $NEW_VERSION"
git tag "v$NEW_VERSION"

echo ""
echo "🚀 Ready to push:"
echo "  git push origin main"
echo "  git push origin v$NEW_VERSION"
echo ""
echo "Or push both at once:"
echo "  git push origin main --tags"