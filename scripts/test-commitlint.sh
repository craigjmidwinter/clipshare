#!/bin/bash

# Test script for commit linting setup
# This script validates that commit linting is working correctly

set -e

echo "🧪 Testing Commit Linting Setup"
echo "================================="

cd "$(dirname "$0")/../web"

echo ""
echo "✅ Testing valid commit messages..."

valid_commits=(
    "feat: add new feature"
    "fix: resolve authentication bug" 
    "docs: update installation guide"
    "feat!: breaking change to API"
    "bump: version 1.2.3"
    "feat(auth): add authentication system"
)

for commit in "${valid_commits[@]}"; do
    echo "   Testing: $commit"
    if echo "$commit" | npx commitlint >/dev/null 2>&1; then
        echo "   ✓ Valid"
    else
        echo "   ✗ Failed (should be valid)"
        exit 1
    fi
done

echo ""
echo "❌ Testing invalid commit messages..."

invalid_commits=(
    "Add new feature"
    "FEAT: add feature"
    "fix"
    "fix: Fix bug."
    "invalid: wrong type"
)

for commit in "${invalid_commits[@]}"; do
    echo "   Testing: $commit"
    if echo "$commit" | npx commitlint >/dev/null 2>&1; then
        echo "   ✗ Passed (should be invalid)"
        exit 1
    else
        echo "   ✓ Correctly rejected"
    fi
done

echo ""
echo "🎉 All tests passed! Commit linting is working correctly."
echo ""
echo "📝 To use commit linting:"
echo "   • All PR commits are automatically validated"
echo "   • Test locally: echo 'feat: message' | npx commitlint"
echo "   • Check last commit: npm run lint:commit-last"
echo ""