#!/bin/bash

# Commit message auto-fixer script
# This script helps automatically fix common commit message format issues

set -e

SCRIPT_DIR="$(dirname "$0")"
WEB_DIR="$SCRIPT_DIR/../web"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_help() {
    echo "🔧 Commit Message Auto-Fixer"
    echo "=============================="
    echo ""
    echo "Usage: $0 [options] [commit-message]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -i, --interactive  Use interactive commitizen"
    echo "  -f, --fix \"message\"  Try to auto-fix a commit message"
    echo "  -v, --validate \"message\"  Just validate without fixing"
    echo ""
    echo "Examples:"
    echo "  $0 -i                           # Interactive commit creation"
    echo "  $0 -f \"Add new feature\"         # Auto-fix: Add new feature -> feat: add new feature"
    echo "  $0 -f \"FIX: Bug in auth\"        # Auto-fix: FIX: Bug in auth -> fix: bug in auth"
    echo "  $0 -v \"feat: add new feature\"   # Just validate the message"
    echo ""
}

# Function to auto-fix common commit message issues
fix_commit_message() {
    local message="$1"
    local fixed_message="$message"
    
    # Remove leading/trailing whitespace
    fixed_message=$(echo "$fixed_message" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    
    # Fix common type case issues
    fixed_message=$(echo "$fixed_message" | sed 's/^FEAT:/feat:/i')
    fixed_message=$(echo "$fixed_message" | sed 's/^FIX:/fix:/i')
    fixed_message=$(echo "$fixed_message" | sed 's/^DOCS:/docs:/i')
    fixed_message=$(echo "$fixed_message" | sed 's/^STYLE:/style:/i')
    fixed_message=$(echo "$fixed_message" | sed 's/^REFACTOR:/refactor:/i')
    fixed_message=$(echo "$fixed_message" | sed 's/^TEST:/test:/i')
    fixed_message=$(echo "$fixed_message" | sed 's/^BUILD:/build:/i')
    fixed_message=$(echo "$fixed_message" | sed 's/^CI:/ci:/i')
    fixed_message=$(echo "$fixed_message" | sed 's/^CHORE:/chore:/i')
    fixed_message=$(echo "$fixed_message" | sed 's/^PERF:/perf:/i')
    fixed_message=$(echo "$fixed_message" | sed 's/^REVERT:/revert:/i')
    fixed_message=$(echo "$fixed_message" | sed 's/^BUMP:/bump:/i')
    
    # Try to detect and add missing type for common patterns
    if [[ ! "$fixed_message" =~ ^[a-z]+.*: ]]; then
        # Check for common keywords to suggest type
        if [[ "$fixed_message" =~ ^[Aa]dd || "$fixed_message" =~ ^[Ii]mplement || "$fixed_message" =~ ^[Cc]reate || "$fixed_message" =~ ^[Nn]ew ]]; then
            fixed_message="feat: $(echo "$fixed_message" | sed 's/^[Aa]dd[[:space:]]*//' | sed 's/^[Ii]mplement[[:space:]]*//' | sed 's/^[Cc]reate[[:space:]]*//' | sed 's/^[Nn]ew[[:space:]]*//')"
        elif [[ "$fixed_message" =~ ^[Ff]ix || "$fixed_message" =~ ^[Rr]esolve || "$fixed_message" =~ ^[Rr]epair || "$fixed_message" =~ [Bb]ug ]]; then
            fixed_message="fix: $(echo "$fixed_message" | sed 's/^[Ff]ix[[:space:]]*//' | sed 's/^[Rr]esolve[[:space:]]*//' | sed 's/^[Rr]epair[[:space:]]*//')"
        elif [[ "$fixed_message" =~ [Dd]oc || "$fixed_message" =~ [Rr]eadme ]]; then
            fixed_message="docs: $(echo "$fixed_message" | sed 's/^[Uu]pdate[[:space:]]*//')"
        elif [[ "$fixed_message" =~ [Tt]est ]]; then
            fixed_message="test: $(echo "$fixed_message" | sed 's/^[Aa]dd[[:space:]]*//')"
        else
            # Default to feat for ambiguous cases
            fixed_message="feat: $fixed_message"
        fi
    fi
    
    # Ensure first letter of description is lowercase
    if [[ "$fixed_message" =~ ^([a-z]+.*: )([A-Z])(.*)$ ]]; then
        prefix="${BASH_REMATCH[1]}"
        first_char="${BASH_REMATCH[2]}"
        rest="${BASH_REMATCH[3]}"
        fixed_message="$prefix$(echo "$first_char" | tr '[:upper:]' '[:lower:]')$rest"
    fi
    
    # Remove trailing periods
    fixed_message=$(echo "$fixed_message" | sed 's/\.[[:space:]]*$//')
    
    # Ensure space after colon
    fixed_message=$(echo "$fixed_message" | sed 's/^\([a-z]\+\(\([^)]*\)\)\?!\?\):\([^[:space:]]\)/\1: \4/')
    
    echo "$fixed_message"
}

# Function to validate commit message
validate_message() {
    local message="$1"
    cd "$WEB_DIR"
    
    if echo "$message" | npx commitlint >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Valid commit message${NC}"
        return 0
    else
        echo -e "${RED}✗ Invalid commit message${NC}"
        echo "$message" | npx commitlint 2>&1 | sed 's/^/  /'
        return 1
    fi
}

# Main script logic
case "$1" in
    -h|--help)
        print_help
        exit 0
        ;;
    -i|--interactive)
        echo -e "${BLUE}🎯 Starting interactive commit creation...${NC}"
        cd "$WEB_DIR"
        npm run commit
        ;;
    -f|--fix)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Please provide a commit message to fix${NC}"
            echo "Usage: $0 -f \"your commit message\""
            exit 1
        fi
        
        original="$2"
        fixed=$(fix_commit_message "$original")
        
        echo -e "${YELLOW}Original:${NC} $original"
        echo -e "${GREEN}Fixed:${NC}    $fixed"
        echo ""
        
        if validate_message "$fixed"; then
            echo ""
            echo -e "${GREEN}🎉 Fixed message is valid!${NC}"
            echo "You can use: git commit -m \"$fixed\""
        else
            echo ""
            echo -e "${RED}❌ Fixed message still has issues. Consider using interactive mode:${NC}"
            echo "  $0 -i"
        fi
        ;;
    -v|--validate)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Please provide a commit message to validate${NC}"
            echo "Usage: $0 -v \"your commit message\""
            exit 1
        fi
        
        echo -e "${BLUE}Validating:${NC} $2"
        validate_message "$2"
        ;;
    *)
        print_help
        exit 1
        ;;
esac