# Commit Linting Setup

This project uses [commitlint](https://commitlint.js.org/) to enforce conventional commit message format, which supports our automatic semantic versioning system.

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): description

[optional body]

[optional footer(s)]
```

### Allowed Types

- `feat`: A new feature (minor version bump)
- `fix`: A bug fix (patch version bump)
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to our CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit
- `bump`: Manual version bumps (skips automatic versioning)

### Breaking Changes

For breaking changes, add `!` after the type:
```bash
feat!: completely rewrite video processing API
```

Or include `BREAKING CHANGE:` in the footer:
```bash
fix: remove deprecated authentication method

BREAKING CHANGE: The old token-based auth has been removed.
```

## Automatic Fixing

### Interactive Commit Creation

Use the interactive commitizen tool to create properly formatted commits:

```bash
cd web
npm run commit
```

This will guide you through creating a conventional commit with prompts for type, scope, description, etc.

### Auto-Fix Existing Messages

Use the auto-fix script to automatically correct common commit message issues:

```bash
# Auto-fix a commit message
./scripts/fix-commit.sh -f "Add new feature"
# Output: feat: add new feature

# Fix uppercase and punctuation issues
./scripts/fix-commit.sh -f "FIX: Bug in authentication."
# Output: fix: bug in authentication

# Auto-detect documentation changes
./scripts/fix-commit.sh -f "Update API documentation"
# Output: docs: API documentation
```

### Common Auto-Fixes

The auto-fixer handles these common issues:

- **Missing type**: `Add feature` → `feat: add feature`
- **Wrong case**: `FEAT: feature` → `feat: feature`
- **Trailing periods**: `fix: bug.` → `fix: bug`
- **Missing space**: `feat:feature` → `feat: feature`
- **Wrong description case**: `feat: Fix Bug` → `feat: fix bug`

### Available Commands

```bash
./scripts/fix-commit.sh -h              # Show help
./scripts/fix-commit.sh -i              # Interactive mode
./scripts/fix-commit.sh -f "message"    # Auto-fix message
./scripts/fix-commit.sh -v "message"    # Validate message
```

## Validation

### Automated (CI)

All pull requests automatically validate commit messages via GitHub Actions. If validation fails, the workflow provides helpful suggestions for fixing the messages.

### Manual Testing

```bash
# Test a commit message
cd web
echo "feat: add new feature" | npx commitlint

# Check last commit
npm run lint:commit-last

# Check commit during editing (for git hooks)
npm run lint:commit

# Interactive commit creation
npm run commit

# Auto-fix a message
../scripts/fix-commit.sh -f "your message"

# Run comprehensive test suite
../scripts/test-commitlint.sh
```

## Local Setup (Optional)

For immediate feedback while committing, you can set up local git hooks:

```bash
# Install husky for git hooks
cd web
npm install --save-dev husky

# Initialize husky
npx husky init

# Add commit-msg hook
echo 'npm run lint:commit' > .husky/commit-msg
chmod +x .husky/commit-msg
```

## Examples

### Valid Commits
```bash
feat: add OBS integration
fix: resolve authentication issue  
docs: update installation guide
feat!: rewrite video processing API
bump: version 1.2.3
```

### Invalid Commits
```bash
Add new feature              # Missing type
FEAT: add feature           # Type should be lowercase
fix                         # Missing description
fix: Fix bug.               # Description should not end with period
```

## Troubleshooting

If commit linting fails:

1. Check that your commit message follows the format: `type: description`
2. Use lowercase for the type
3. Don't end the description with a period
4. Keep the header under 100 characters
5. Use valid types from the list above

For more details, see the [commitlint documentation](https://commitlint.js.org/).