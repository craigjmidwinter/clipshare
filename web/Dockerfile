# Use the official Node.js runtime as a parent image
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install Python and other build dependencies needed by youtube-dl-exec
RUN apk add --no-cache python3 py3-pip

# Install all dependencies (including devDependencies needed for build)
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application with standard webpack (not turbopack for Docker compatibility)
RUN npm run build:docker

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1

# Install system dependencies needed by the app (install yt-dlp from apk for a real binary in PATH)
RUN apk add --no-cache ffmpeg yt-dlp shadow curl

# Ensure the application knows where yt-dlp lives inside the container
ENV YT_DLP_PATH=/usr/bin/yt-dlp

# Install Prisma CLI for database initialization
RUN npm install -g prisma@latest

# Add user and group with configurable UID/GID
ARG PUID=1001
ARG PGID=1001
RUN addgroup -g ${PGID} clipshare && \
    adduser -u ${PUID} -G clipshare -s /bin/sh -D clipshare

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown clipshare:clipshare .next

# Create data directory and set permissions
RUN mkdir -p /app/data/{db,processed-files,temp,logs} && \
    chown -R clipshare:clipshare /app/data

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=clipshare:clipshare /app/.next/standalone ./
COPY --from=builder --chown=clipshare:clipshare /app/.next/static ./.next/static

# Copy Prisma schema and node_modules for database initialization
COPY --from=builder --chown=clipshare:clipshare /app/prisma ./prisma
COPY --from=builder --chown=clipshare:clipshare /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=clipshare:clipshare /app/node_modules/@prisma ./node_modules/@prisma

# Copy database initialization script
COPY --from=builder --chown=clipshare:clipshare /app/scripts ./scripts

# Create startup script to initialize database (before switching user)
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo 'echo "Initializing database..."' >> /app/start.sh && \
    echo 'node /app/scripts/init-db.js' >> /app/start.sh && \
    echo 'echo "Starting application..."' >> /app/start.sh && \
    echo 'exec node server.js' >> /app/start.sh && \
    chmod +x /app/start.sh && \
    chown clipshare:clipshare /app/start.sh

USER clipshare

EXPOSE 3000

ENV PORT=3000
# set hostname to localhost
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["/app/start.sh"]