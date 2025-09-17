#!/bin/bash

# Clipshare Docker Setup Script
# This script helps set up Clipshare with Docker

set -e

echo "🎬 Clipshare Docker Setup"
echo "========================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists docker; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    echo "   Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker prerequisites satisfied"

# Choose deployment type
echo ""
echo "📋 Choose deployment type:"
echo "1) Development/Testing (SQLite, single container)"
echo "2) Production (PostgreSQL, Nginx, Redis)"
read -p "Enter choice (1-2): " choice

case $choice in
    1)
        COMPOSE_FILE="docker-compose.yml"
        echo "🛠️ Setting up development environment"
        ;;
    2)
        COMPOSE_FILE="docker-compose.production.yml"
        echo "🚀 Setting up production environment"
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

# Create data directories
echo ""
echo "📁 Creating single data directory structure..."
mkdir -p data/{processed-files,temp,db,logs}

if [ "$choice" = "2" ]; then
    echo "Creating production directories..."
    sudo mkdir -p /var/lib/clipshare/data/{processed-files,db,temp,logs} 2>/dev/null || {
        echo "⚠️ Could not create /var/lib/clipshare/data directories (requires sudo)"
        echo "   You may need to create these manually:"
        echo "   sudo mkdir -p /var/lib/clipshare/data/{processed-files,db,temp,logs}"
    }
fi

echo "✅ Single data directory structure created"

# Copy environment file
echo ""
echo "⚙️ Setting up environment configuration..."
if [ ! -f .env ]; then
    cp .env.docker .env
    echo "✅ Environment file created (.env)"
    echo ""
    echo "🔧 IMPORTANT: Edit .env file with your configuration:"
    echo "   - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)"
    echo "   - NEXTAUTH_URL (your domain)"
    echo "   - PLEX_CLIENT_ID, PLEX_SERVER_URL, PLEX_SERVER_TOKEN"
    if [ "$choice" = "2" ]; then
        echo "   - POSTGRES_PASSWORD (secure database password)"
    fi
else
    echo "✅ Environment file already exists"
fi

# Generate Plex Client ID
echo ""
echo "🔑 Generating Plex Client ID..."
cd web && npm run generate-client-id 2>/dev/null || {
    echo "⚠️ Could not generate Plex Client ID automatically"
    echo "   You can generate one manually or use: 800c9d71-8ba6-4273-83a4-a71c6dfb3e85"
}
cd ..

# Validate Docker Compose configuration
echo ""
echo "✅ Validating Docker configuration..."
if docker compose -f "$COMPOSE_FILE" config >/dev/null; then
    echo "✅ Docker Compose configuration is valid"
else
    echo "❌ Docker Compose configuration has errors"
    exit 1
fi

# Final instructions
echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Start the application:"
if [ "$choice" = "1" ]; then
    echo "   docker compose up -d"
else
    echo "   docker compose -f docker-compose.production.yml up -d"
fi
echo "3. Access Clipshare at http://localhost:3000"
echo ""
echo "For help:"
echo "- View logs: docker compose logs -f clipshare"
echo "- Documentation: README.md, DOCKER_DEPLOYMENT.md"
echo ""
echo "🚀 Happy clipping!"