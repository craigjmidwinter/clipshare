# Clipshare Deployment Guide

Complete guide for deploying Clipshare to production environments with various deployment strategies and configurations.

## 📖 Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Docker Deployment](#docker-deployment)
5. [Manual Deployment](#manual-deployment)
6. [Cloud Deployments](#cloud-deployments)
7. [Load Balancing & Scaling](#load-balancing--scaling)
8. [Database Management](#database-management)
9. [File Storage](#file-storage)
10. [Security Configuration](#security-configuration)
11. [Monitoring & Logging](#monitoring--logging)
12. [Backup & Recovery](#backup--recovery)
13. [Maintenance](#maintenance)
14. [Troubleshooting](#troubleshooting)

## Deployment Overview

### Deployment Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   File Storage  │    │   Plex Server   │
│   (Nginx/HAProxy) │    │   (Local/NFS/S3)│    │   Integration   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Clipshare Application                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Web App   │  │   API       │  │   Background Jobs       │ │
│  │   (Next.js) │  │   Routes    │  │   (Processing)          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────┬───────────────┬───────────────────┬─────────────────┘
          │               │                   │
          ▼               ▼                   ▼
┌─────────────┐  ┌─────────────┐    ┌─────────────────┐
│  Database   │  │ File System │    │  External APIs  │
│  (SQLite/PG) │  │ (Clips)     │    │  (Auth, CDN)    │
└─────────────┘  └─────────────┘    └─────────────────┘
```

### Deployment Options

1. **Docker Deployment** (Recommended)
   - Containerized application
   - Easy scaling and management
   - Consistent environments

2. **Manual Deployment**
   - Direct server installation
   - Maximum control and customization
   - Traditional server management

3. **Cloud Platforms**
   - AWS, Google Cloud, Azure
   - Managed services integration
   - Auto-scaling capabilities

## Prerequisites

### System Requirements

**Minimum Requirements:**
- **CPU**: 2 cores, 2.0 GHz
- **RAM**: 4 GB
- **Storage**: 20 GB available space
- **Network**: 100 Mbps connection
- **OS**: Linux (Ubuntu 20.04+), Windows Server, macOS

**Recommended Requirements:**
- **CPU**: 4+ cores, 2.5+ GHz
- **RAM**: 8+ GB
- **Storage**: 100+ GB SSD
- **Network**: 1 Gbps connection
- **OS**: Ubuntu 22.04 LTS

### Software Dependencies

**Core Dependencies:**
```bash
# Node.js and npm
Node.js 20.x or higher
npm 10.x or higher

# Database
SQLite 3.x (included with Node.js)
# OR PostgreSQL 14+ (for larger deployments)

# Process Management
PM2 (for production process management)
systemd (Linux systems)

# Web Server (Optional)
Nginx 1.18+ or Apache 2.4+

# SSL/TLS
Let's Encrypt certbot (for HTTPS)
```

**Development Tools (for building):**
```bash
# Build tools
Git 2.x
Python 3.7+ (for native modules)
Build essentials (gcc, make, etc.)
```

## Environment Configuration

### Production Environment Variables

Create a `.env.production` file with production-specific settings:

```bash
# Application Environment
NODE_ENV=production
PORT=3000

# Next.js Configuration
NEXTAUTH_URL=https://clipshare.yourdomain.com
NEXTAUTH_SECRET=your-super-secret-key-at-least-32-characters-long

# Database Configuration
DATABASE_URL=file:/var/lib/clipshare/database.db
# OR for PostgreSQL:
# DATABASE_URL=postgresql://username:password@localhost:5432/clipshare

# Plex Integration
PLEX_CLIENT_ID=your-unique-client-id
PLEX_CLIENT_SECRET=your-plex-client-secret
PLEX_SERVER_URL=http://your-plex-server:32400
PLEX_SERVER_TOKEN=your-plex-server-token

# File Storage
CLIPS_DIR=/var/lib/clipshare/clips
EXPORT_DIR=/var/lib/clipshare/exports
TEMP_DIR=/tmp/clipshare

# Performance Configuration
PROCESS_CONCURRENCY=4
MAX_CONCURRENT_JOBS=2
MAX_CLIP_SIZE=500MB
VIDEO_QUALITY_DEFAULT=1080p

# Security
CORS_ORIGIN=https://clipshare.yourdomain.com
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW=3600

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/clipshare/application.log

# Monitoring (Optional)
SENTRY_DSN=your-sentry-dsn
ANALYTICS_ID=your-analytics-id
```

### Environment Validation

Create an environment validation script:

```bash
#!/bin/bash
# scripts/validate-env.sh

echo "🔍 Validating production environment..."

# Required variables
required_vars=(
  "NODE_ENV"
  "NEXTAUTH_URL"
  "NEXTAUTH_SECRET"
  "DATABASE_URL"
  "PLEX_CLIENT_ID"
)

missing_vars=()

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    missing_vars+=("$var")
  fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
  echo "❌ Missing required environment variables:"
  printf ' - %s\n' "${missing_vars[@]}"
  exit 1
fi

# Validate directory permissions
dirs=("$CLIPS_DIR" "$EXPORT_DIR" "$TEMP_DIR")
for dir in "${dirs[@]}"; do
  if [ ! -d "$dir" ] || [ ! -w "$dir" ]; then
    echo "❌ Directory not writable: $dir"
    exit 1
  fi
done

echo "✅ Environment validation passed!"
```

## Docker Deployment

### Quick Start

1. **Start the Application**:
   ```bash
   docker-compose up -d
   ```

2. **Access the Application**:
   - Open http://localhost:3000 in your browser
   - Complete the welcome wizard to configure Plex integration

The Docker image automatically handles data directory creation and permissions - no setup required!

### Customizing User Permissions

If you need to customize the user/group IDs for your specific system, you can set the `PUID` and `PGID` environment variables:

```yaml
environment:
  - PUID=1000    # Your user ID
  - PGID=1000    # Your group ID
```

To find your user and group IDs:
```bash
id $USER
```

### Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copy package files
COPY web/package.json web/package-lock.json ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web/ .
COPY .env.production .env.local

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create system user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files
COPY --from=builder /app/node_modules/.prisma ./.prisma
COPY --from=builder /app/prisma ./prisma

# Create data directories
RUN mkdir -p /var/lib/clipshare/clips /var/lib/clipshare/exports /tmp/clipshare
RUN chown -R nextjs:nodejs /var/lib/clipshare /tmp/clipshare

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### Docker Compose Configuration

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  clipshare:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/var/lib/clipshare/database.db
      - NEXTAUTH_URL=https://clipshare.yourdomain.com
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - PLEX_CLIENT_ID=${PLEX_CLIENT_ID}
      - PLEX_SERVER_URL=${PLEX_SERVER_URL}
      - PLEX_SERVER_TOKEN=${PLEX_SERVER_TOKEN}
      - CLIPS_DIR=/var/lib/clipshare/clips
      - EXPORT_DIR=/var/lib/clipshare/exports
    volumes:
      - clipshare_data:/var/lib/clipshare
      - clipshare_logs:/var/log/clipshare
      - /etc/localtime:/etc/localtime:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - clipshare_data:/var/www/clips:ro
    depends_on:
      - clipshare
    restart: unless-stopped

  # Optional: PostgreSQL for larger deployments
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=clipshare
      - POSTGRES_USER=clipshare
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    profiles: ["postgres"]

volumes:
  clipshare_data:
  clipshare_logs:
  postgres_data:
```

### Docker Deployment Commands

```bash
# Build and deploy
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose -f docker-compose.production.yml logs -f clipshare

# Update deployment
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d

# Backup data
docker run --rm -v clipshare_data:/data -v $(pwd):/backup alpine tar czf /backup/clipshare-backup-$(date +%Y%m%d).tar.gz /data

# Scale service (with load balancer)
docker-compose -f docker-compose.production.yml up -d --scale clipshare=3
```

## Manual Deployment

### Server Preparation

```bash
# Ubuntu/Debian setup
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install additional dependencies
sudo apt-get install -y git python3 build-essential nginx certbot python3-certbot-nginx

# Create application user
sudo useradd -m -s /bin/bash clipshare
sudo usermod -aG sudo clipshare

# Create application directories
sudo mkdir -p /opt/clipshare /var/lib/clipshare/{clips,exports} /var/log/clipshare
sudo chown -R clipshare:clipshare /opt/clipshare /var/lib/clipshare /var/log/clipshare
```

### Application Installation

```bash
# Switch to application user
sudo su - clipshare

# Clone repository
cd /opt
git clone https://github.com/yourusername/clipshare.git
cd clipshare/web

# Install dependencies
npm ci --only=production

# Set up environment
cp .env.example .env.production
# Edit .env.production with your settings

# Generate Prisma client
npx prisma generate

# Initialize database
npx prisma db push

# Build application
npm run build

# Install PM2 for process management
npm install -g pm2
```

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'clipshare',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '.env.production',
    log_file: '/var/log/clipshare/application.log',
    error_file: '/var/log/clipshare/error.log',
    out_file: '/var/log/clipshare/out.log',
    max_memory_restart: '1G',
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.git'],
    merge_logs: true,
    time: true
  }]
}
```

```bash
# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set up PM2 startup script
pm2 startup

# Monitor application
pm2 status
pm2 logs clipshare
```

### Systemd Service (Alternative to PM2)

```ini
# /etc/systemd/system/clipshare.service
[Unit]
Description=Clipshare Video Collaboration Platform
After=network.target

[Service]
Type=simple
User=clipshare
Group=clipshare
WorkingDirectory=/opt/clipshare/web
Environment=NODE_ENV=production
EnvironmentFile=/opt/clipshare/web/.env.production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=clipshare

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable clipshare
sudo systemctl start clipshare
sudo systemctl status clipshare

# View logs
sudo journalctl -u clipshare -f
```

## Cloud Deployments

### AWS Deployment

**EC2 + RDS Deployment:**

```yaml
# cloudformation-template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Clipshare deployment on AWS

Parameters:
  InstanceType:
    Type: String
    Default: t3.medium
    AllowedValues: [t3.small, t3.medium, t3.large]
  
  KeyPairName:
    Type: AWS::EC2::KeyPair::KeyName
    Description: EC2 Key Pair for SSH access

Resources:
  ClipshareVPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true

  ClipshareSubnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref ClipshareVPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: !Select [0, !GetAZs '']
      MapPublicIpOnLaunch: true

  ClipshareSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for Clipshare
      VpcId: !Ref ClipshareVPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0

  ClipshareInstance:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: ami-0c02fb55956c7d316  # Amazon Linux 2
      InstanceType: !Ref InstanceType
      KeyName: !Ref KeyPairName
      SecurityGroupIds:
        - !Ref ClipshareSecurityGroup
      SubnetId: !Ref ClipshareSubnet
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash
          yum update -y
          curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
          yum install -y nodejs git docker
          systemctl start docker
          systemctl enable docker
          usermod -a -G docker ec2-user
```

**ECS Deployment:**

```yaml
# ecs-task-definition.yaml
family: clipshare
networkMode: awsvpc
requiresCompatibilities:
  - FARGATE
cpu: 1024
memory: 2048
executionRoleArn: arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole

containerDefinitions:
  - name: clipshare
    image: your-account.dkr.ecr.region.amazonaws.com/clipshare:latest
    portMappings:
      - containerPort: 3000
        protocol: tcp
    environment:
      - name: NODE_ENV
        value: production
      - name: DATABASE_URL
        value: !Ref DatabaseUrl
    secrets:
      - name: NEXTAUTH_SECRET
        valueFrom: arn:aws:secretsmanager:region:account:secret:clipshare/auth
    logConfiguration:
      logDriver: awslogs
      options:
        awslogs-group: /ecs/clipshare
        awslogs-region: us-east-1
        awslogs-stream-prefix: ecs
```

### Google Cloud Platform

```yaml
# app.yaml (App Engine)
runtime: nodejs20

env_variables:
  NODE_ENV: production
  DATABASE_URL: "postgresql://user:pass@/clipshare?host=/cloudsql/project:region:instance"
  NEXTAUTH_URL: "https://your-project.appspot.com"

automatic_scaling:
  min_instances: 1
  max_instances: 10
  target_cpu_utilization: 0.6

vpc_access_connector:
  name: projects/PROJECT_ID/locations/REGION/connectors/CONNECTOR_NAME

handlers:
  - url: /.*
    script: auto
    secure: always
```

### Azure Deployment

```yaml
# azure-pipelines.yml
trigger:
  - main

pool:
  vmImage: ubuntu-latest

variables:
  azureSubscription: 'your-subscription'
  appName: 'clipshare-app'
  resourceGroupName: 'clipshare-rg'

stages:
  - stage: Build
    jobs:
      - job: BuildAndTest
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'
          
          - script: |
              cd web
              npm ci
              npm run build
              npm run test
            displayName: 'Build and test'
          
          - task: ArchiveFiles@2
            inputs:
              rootFolderOrFile: 'web'
              includeRootFolder: false
              archiveType: 'zip'
              archiveFile: '$(Build.ArtifactStagingDirectory)/clipshare.zip'
          
          - task: PublishBuildArtifacts@1
            inputs:
              PathtoPublish: '$(Build.ArtifactStagingDirectory)'
              ArtifactName: 'drop'

  - stage: Deploy
    dependsOn: Build
    jobs:
      - deployment: DeployToAzure
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: '$(azureSubscription)'
                    appType: 'webAppLinux'
                    appName: '$(appName)'
                    package: '$(Pipeline.Workspace)/drop/clipshare.zip'
                    runtimeStack: 'NODE|20-lts'
```

## Load Balancing & Scaling

### Nginx Load Balancer Configuration

```nginx
# /etc/nginx/sites-available/clipshare
upstream clipshare_backend {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3002 max_fails=3 fail_timeout=30s;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name clipshare.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    server_name clipshare.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/clipshare.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/clipshare.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!SHA1:!WEAK;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Client max body size for uploads
    client_max_body_size 500M;

    # Main application
    location / {
        proxy_pass http://clipshare_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support for real-time features
    location /ws {
        proxy_pass http://clipshare_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files (clips) - served directly by nginx
    location /clips/ {
        alias /var/lib/clipshare/clips/;
        expires 1d;
        add_header Cache-Control "public, immutable";
        
        # Security for clip access
        internal;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### HAProxy Configuration (Alternative)

```
# /etc/haproxy/haproxy.cfg
global
    daemon
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms
    option httplog
    option dontlognull

frontend clipshare_frontend
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/clipshare.pem
    redirect scheme https if !{ ssl_fc }
    
    default_backend clipshare_backend

backend clipshare_backend
    balance roundrobin
    option httpchk GET /api/health
    
    server app1 127.0.0.1:3000 check
    server app2 127.0.0.1:3001 check
    server app3 127.0.0.1:3002 check

listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 30s
```

## Database Management

### SQLite Production Configuration

```bash
# SQLite optimization for production
sqlite3 /var/lib/clipshare/database.db << EOF
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 1000000;
PRAGMA foreign_keys = ON;
PRAGMA temp_store = MEMORY;
EOF
```

### PostgreSQL Migration

```sql
-- Migration script from SQLite to PostgreSQL
-- 1. Export data from SQLite
.mode insert
.output clipshare_data.sql
.dump

-- 2. Create PostgreSQL schema
CREATE DATABASE clipshare;
\c clipshare;

-- 3. Run Prisma migrations
npx prisma db push --schema=prisma/schema.prisma

-- 4. Import data (after conversion)
psql -d clipshare -f clipshare_data_converted.sql
```

```javascript
// prisma/schema.prisma - PostgreSQL configuration
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Update models for PostgreSQL optimizations
model Workspace {
  id                String   @id @default(cuid())
  // ... other fields
  
  @@index([producerId])
  @@index([processingStatus])
  @@index([createdAt])
}

model Bookmark {
  id          String   @id @default(cuid())
  // ... other fields
  
  @@index([workspaceId])
  @@index([createdBy])
  @@index([startMs, endMs])
}
```

### Database Maintenance Scripts

```bash
#!/bin/bash
# scripts/db-maintenance.sh

DB_PATH="/var/lib/clipshare/database.db"
BACKUP_DIR="/var/backups/clipshare"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
sqlite3 "$DB_PATH" ".backup $BACKUP_DIR/clipshare-$(date +%Y%m%d-%H%M%S).db"

# Optimize database
sqlite3 "$DB_PATH" << EOF
PRAGMA integrity_check;
PRAGMA optimize;
VACUUM;
ANALYZE;
EOF

# Cleanup old backups (keep 30 days)
find "$BACKUP_DIR" -name "clipshare-*.db" -mtime +30 -delete

echo "Database maintenance completed"
```

## File Storage

### Local File Storage Setup

```bash
# Create storage directories with proper permissions
sudo mkdir -p /var/lib/clipshare/{clips,exports,temp}
sudo chown -R clipshare:clipshare /var/lib/clipshare
sudo chmod -R 755 /var/lib/clipshare

# Set up log rotation for large files
sudo tee /etc/logrotate.d/clipshare << EOF
/var/log/clipshare/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 clipshare clipshare
    postrotate
        systemctl reload clipshare
    endscript
}
EOF
```

### NFS Network Storage

```bash
# Install NFS client
sudo apt-get install nfs-common

# Mount NFS share
sudo mkdir -p /mnt/clipshare-storage
sudo mount -t nfs nfs-server:/path/to/clipshare /mnt/clipshare-storage

# Add to /etc/fstab for persistent mounting
echo "nfs-server:/path/to/clipshare /mnt/clipshare-storage nfs defaults 0 0" | sudo tee -a /etc/fstab

# Update application configuration
# In .env.production:
CLIPS_DIR=/mnt/clipshare-storage/clips
EXPORT_DIR=/mnt/clipshare-storage/exports
```

### S3-Compatible Storage Integration

```typescript
// lib/storage-service.ts
import AWS from 'aws-sdk'

export class S3StorageService {
  private s3: AWS.S3

  constructor() {
    this.s3 = new AWS.S3({
      endpoint: process.env.S3_ENDPOINT,
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
      s3ForcePathStyle: true,
      signatureVersion: 'v4'
    })
  }

  async uploadClip(filePath: string, key: string): Promise<string> {
    const fileStream = fs.createReadStream(filePath)
    
    const uploadParams = {
      Bucket: process.env.S3_BUCKET!,
      Key: `clips/${key}`,
      Body: fileStream,
      ContentType: 'video/mp4'
    }

    const result = await this.s3.upload(uploadParams).promise()
    return result.Location
  }

  async generatePresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    return this.s3.getSignedUrl('getObject', {
      Bucket: process.env.S3_BUCKET!,
      Key: `clips/${key}`,
      Expires: expiresIn
    })
  }
}
```

## Security Configuration

### SSL/TLS Setup

```bash
# Install Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d clipshare.yourdomain.com

# Auto-renewal setup
sudo crontab -e
# Add: 0 2 * * * /usr/bin/certbot renew --quiet
```

### Firewall Configuration

```bash
# UFW (Ubuntu Firewall)
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow specific IP ranges (optional)
sudo ufw allow from 192.168.1.0/24 to any port 22

# View status
sudo ufw status verbose
```

### Security Headers and Configuration

```nginx
# Additional security configuration for nginx
# Add to server block

# Security headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss:; font-src 'self'; object-src 'none'; media-src 'self'; frame-ancestors 'none';" always;

# Hide nginx version
server_tokens off;

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

location /api/ {
    limit_req zone=api burst=20 nodelay;
    # ... other proxy settings
}

location /api/auth/ {
    limit_req zone=login burst=5 nodelay;
    # ... other proxy settings
}
```

## Monitoring & Logging

### Application Monitoring

```typescript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs'

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Filter sensitive data
    if (event.request?.headers) {
      delete event.request.headers['authorization']
      delete event.request.headers['x-plex-token']
    }
    return event
  }
})

// Health check endpoint
export async function GET() {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`
    
    // Check file system access
    await fs.access(process.env.CLIPS_DIR!)
    
    // Check Plex connectivity (optional)
    const plexHealth = await checkPlexHealth()
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        filesystem: 'up',
        plex: plexHealth ? 'up' : 'degraded'
      }
    })
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json({
      status: 'unhealthy',
      error: 'Service check failed'
    }, { status: 503 })
  }
}
```

### Log Aggregation

```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  clipshare:
    # ... existing configuration
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service=clipshare"

  fluentd:
    image: fluent/fluentd:v1.14-debian
    volumes:
      - ./fluentd/conf:/fluentd/etc
      - clipshare_logs:/var/log/clipshare
    ports:
      - "24224:24224"
    environment:
      FLUENTD_CONF: fluent.conf

  elasticsearch:
    image: elasticsearch:7.17.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"

  kibana:
    image: kibana:7.17.0
    ports:
      - "5601:5601"
    environment:
      ELASTICSEARCH_HOSTS: http://elasticsearch:9200
```

### Prometheus Metrics

```typescript
// lib/metrics.ts
import client from 'prom-client'

// Create metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
})

const activeConnections = new client.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections'
})

const processingJobs = new client.Gauge({
  name: 'processing_jobs_total',
  help: 'Number of processing jobs by status',
  labelNames: ['status']
})

// Metrics endpoint
export async function GET() {
  const register = client.register
  const metrics = await register.metrics()
  
  return new Response(metrics, {
    headers: {
      'Content-Type': register.contentType
    }
  })
}
```

## Backup & Recovery

### Automated Backup Script

```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/var/backups/clipshare"
DB_PATH="/var/lib/clipshare/database.db"
DATA_DIR="/var/lib/clipshare"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="clipshare_backup_$TIMESTAMP"

echo "Starting backup: $BACKUP_NAME"

# Create backup directory for this backup
CURRENT_BACKUP="$BACKUP_DIR/$BACKUP_NAME"
mkdir -p "$CURRENT_BACKUP"

# Backup database
if [ -f "$DB_PATH" ]; then
    sqlite3 "$DB_PATH" ".backup $CURRENT_BACKUP/database.db"
    echo "Database backed up"
else
    echo "Warning: Database file not found"
fi

# Backup application data
tar -czf "$CURRENT_BACKUP/clips.tar.gz" -C "$DATA_DIR" clips/ 2>/dev/null || echo "No clips to backup"
tar -czf "$CURRENT_BACKUP/exports.tar.gz" -C "$DATA_DIR" exports/ 2>/dev/null || echo "No exports to backup"

# Backup configuration
cp /opt/clipshare/web/.env.production "$CURRENT_BACKUP/env.production" 2>/dev/null || echo "No env file to backup"

# Create backup manifest
cat > "$CURRENT_BACKUP/manifest.txt" << EOF
Backup created: $(date)
Database: $([ -f "$CURRENT_BACKUP/database.db" ] && echo "✓" || echo "✗")
Clips: $([ -f "$CURRENT_BACKUP/clips.tar.gz" ] && echo "✓" || echo "✗")
Exports: $([ -f "$CURRENT_BACKUP/exports.tar.gz" ] && echo "✓" || echo "✗")
Config: $([ -f "$CURRENT_BACKUP/env.production" ] && echo "✓" || echo "✗")
EOF

# Compress entire backup
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME/"
rm -rf "$BACKUP_NAME"

echo "Backup completed: ${BACKUP_NAME}.tar.gz"

# Cleanup old backups
find "$BACKUP_DIR" -name "clipshare_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
echo "Cleaned up backups older than $RETENTION_DAYS days"

# Upload to remote storage (optional)
if [ -n "$BACKUP_S3_BUCKET" ]; then
    aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" "s3://$BACKUP_S3_BUCKET/clipshare/"
    echo "Backup uploaded to S3"
fi
```

### Recovery Procedures

```bash
#!/bin/bash
# scripts/restore.sh

BACKUP_FILE="$1"
RESTORE_DIR="/tmp/clipshare_restore"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.tar.gz>"
    exit 1
fi

echo "Restoring from: $BACKUP_FILE"

# Extract backup
mkdir -p "$RESTORE_DIR"
tar -xzf "$BACKUP_FILE" -C "$RESTORE_DIR"

# Stop application
sudo systemctl stop clipshare

# Restore database
if [ -f "$RESTORE_DIR"/*/database.db ]; then
    sudo cp "$RESTORE_DIR"/*/database.db /var/lib/clipshare/database.db
    sudo chown clipshare:clipshare /var/lib/clipshare/database.db
    echo "Database restored"
fi

# Restore clips
if [ -f "$RESTORE_DIR"/*/clips.tar.gz ]; then
    sudo rm -rf /var/lib/clipshare/clips/*
    sudo tar -xzf "$RESTORE_DIR"/*/clips.tar.gz -C /var/lib/clipshare/
    sudo chown -R clipshare:clipshare /var/lib/clipshare/clips
    echo "Clips restored"
fi

# Restore exports
if [ -f "$RESTORE_DIR"/*/exports.tar.gz ]; then
    sudo rm -rf /var/lib/clipshare/exports/*
    sudo tar -xzf "$RESTORE_DIR"/*/exports.tar.gz -C /var/lib/clipshare/
    sudo chown -R clipshare:clipshare /var/lib/clipshare/exports
    echo "Exports restored"
fi

# Restore configuration (manual review required)
if [ -f "$RESTORE_DIR"/*/env.production ]; then
    echo "Configuration file found at: $RESTORE_DIR/*/env.production"
    echo "Please review and manually restore if needed"
fi

# Start application
sudo systemctl start clipshare

# Cleanup
rm -rf "$RESTORE_DIR"

echo "Restore completed. Please verify application functionality."
```

## Maintenance

### Update Procedures

```bash
#!/bin/bash
# scripts/update.sh

echo "Starting Clipshare update..."

# Backup before update
./scripts/backup.sh

# Pull latest code
cd /opt/clipshare
git fetch origin
git checkout main
git pull origin main

# Update dependencies
cd web
npm ci --only=production

# Run database migrations
npx prisma generate
npx prisma db push

# Build application
npm run build

# Restart application
sudo systemctl restart clipshare

# Verify deployment
sleep 10
curl -f http://localhost:3000/api/health || echo "Health check failed!"

echo "Update completed"
```

### Maintenance Tasks

```bash
#!/bin/bash
# scripts/maintenance.sh

echo "Running maintenance tasks..."

# Clean up temporary files
find /tmp/clipshare -type f -mtime +1 -delete 2>/dev/null

# Clean up old logs
find /var/log/clipshare -name "*.log.*" -mtime +7 -delete

# Clean up old processed clips (optional)
find /var/lib/clipshare/clips -name "*.mp4" -mtime +30 -delete

# Database maintenance
sqlite3 /var/lib/clipshare/database.db << EOF
PRAGMA optimize;
VACUUM;
ANALYZE;
EOF

# Check disk space
df -h /var/lib/clipshare

echo "Maintenance completed"
```

## Troubleshooting

### Common Issues

**Application Won't Start:**
```bash
# Check logs
sudo journalctl -u clipshare -f
# or
pm2 logs clipshare

# Check port availability
sudo netstat -tlnp | grep :3000

# Check permissions
ls -la /var/lib/clipshare
```

**Database Connection Issues:**
```bash
# Check database file
sqlite3 /var/lib/clipshare/database.db "SELECT name FROM sqlite_master WHERE type='table';"

# Check permissions
ls -la /var/lib/clipshare/database.db

# Regenerate Prisma client
cd /opt/clipshare/web
npx prisma generate
```

**Performance Issues:**
```bash
# Check system resources
htop
iostat -x 1
free -h

# Check application metrics
curl http://localhost:3000/api/metrics

# Check database performance
sqlite3 /var/lib/clipshare/database.db "PRAGMA integrity_check;"
```

### Debug Mode

```bash
# Enable debug logging
export DEBUG=clipshare:*
export LOG_LEVEL=debug

# Start application in debug mode
npm run dev
```

This comprehensive deployment guide covers all aspects of getting Clipshare running in production environments, from simple single-server deployments to complex cloud-based architectures with monitoring and scaling capabilities.