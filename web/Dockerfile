# Use the official Node.js runtime as a parent image
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

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

# Install system dependencies needed by the app
RUN apk add --no-cache ffmpeg python3 py3-pip shadow

# Add user and group with configurable UID/GID
ARG PUID=1000
ARG PGID=1000
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

USER clipshare

EXPOSE 3000

ENV PORT=3000
# set hostname to localhost
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]