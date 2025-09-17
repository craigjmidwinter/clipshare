#!/bin/bash

# Setup script for Clipshare data directories
# This ensures the data directory has the correct permissions for Docker

echo "Setting up Clipshare data directories..."

# Create data directory structure
mkdir -p data/{db,processed-files,temp,logs}

# Set permissions for Docker user (1001:1001)
# This matches the nextjs user in the Docker container
chown -R 1001:1001 data/

# Set appropriate permissions
chmod -R 755 data/

echo "Data directories created and permissions set:"
echo "- data/db (for SQLite database)"
echo "- data/processed-files (for processed video files)"
echo "- data/temp (for temporary files)"
echo "- data/logs (for application logs)"
echo ""
echo "You can now run: docker-compose up -d"
