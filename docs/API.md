# Clipshare API Reference

Complete reference for Clipshare's REST API endpoints, authentication, and integration patterns.

## 📖 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Conventions](#api-conventions)
4. [Core Endpoints](#core-endpoints)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Examples](#examples)
8. [Webhooks](#webhooks)
9. [SDKs and Libraries](#sdks-and-libraries)

## Overview

The Clipshare API provides programmatic access to all core functionality including workspace management, bookmark creation, user management, and content processing.

### Base URL
```
https://your-clipshare-instance.com/api
```

### API Version
Current version: `v1` (implied in all endpoints)

### Content Types
- **Request**: `application/json`
- **Response**: `application/json`
- **File uploads**: `multipart/form-data`

## Authentication

### NextAuth.js Session-Based

Clipshare uses NextAuth.js for authentication. All API requests must include a valid session.

**Browser Usage (Automatic):**
```javascript
// Session automatically included in same-origin requests
const response = await fetch('/api/workspaces')
```

**External Usage (Manual):**
```javascript
// Get session token
const session = await getSession()

// Include in requests
const response = await fetch('/api/workspaces', {
  headers: {
    'Authorization': `Bearer ${session.accessToken}`,
    'Content-Type': 'application/json'
  }
})
```

### Plex Authentication Flow

For Plex integration, additional authentication may be required:

```javascript
// Check Plex configuration
const plexConfig = await fetch('/api/plex/config')

// If not configured, redirect to Plex auth
if (!plexConfig.ok) {
  window.location.href = '/api/auth/signin/plex'
}
```

## API Conventions

### HTTP Methods
- `GET` - Retrieve data
- `POST` - Create new resources
- `PUT` - Update existing resources (full replacement)
- `PATCH` - Partial updates
- `DELETE` - Remove resources

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { /* response data */ },
  "meta": {
    "timestamp": "2024-12-18T10:30:00Z",
    "version": "1.0.0"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "title",
        "message": "Title is required"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-12-18T10:30:00Z",
    "requestId": "req_123456"
  }
}
```

### Pagination

For list endpoints that support pagination:

```json
{
  "data": [/* items */],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalPages": 5,
    "totalItems": 95,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Core Endpoints

### Authentication

#### Get Current User
```http
GET /api/auth/session
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "name": "John Doe",
      "email": "john@example.com",
      "image": "https://plex.tv/avatar.jpg",
      "onboardingCompleted": true
    },
    "expires": "2024-12-18T10:30:00Z"
  }
}
```

#### Complete Onboarding
```http
POST /api/user/onboarding-complete
```

**Request:**
```json
{
  "plexServerUrl": "http://192.168.1.100:32400",
  "plexServerToken": "xxxxxxxxxxxx"
}
```

### Workspaces

#### List Workspaces
```http
GET /api/workspaces
```

**Query Parameters:**
- `page` (number) - Page number (default: 1)
- `pageSize` (number) - Items per page (default: 20, max: 100)
- `role` (string) - Filter by role: `producer` | `collaborator`
- `status` (string) - Filter by processing status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ws_123",
      "title": "Episode 5 Cold Open",
      "description": "Reviewing the cold open sequence",
      "contentTitle": "The Office S05E01",
      "contentPoster": "https://plex.tv/poster.jpg",
      "processingStatus": "complete",
      "processingProgress": 100,
      "role": "producer",
      "memberCount": 3,
      "bookmarkCount": 12,
      "createdAt": "2024-12-15T09:00:00Z",
      "updatedAt": "2024-12-17T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalPages": 2,
    "totalItems": 25
  }
}
```

#### Create Workspace
```http
POST /api/workspaces
```

**Request:**
```json
{
  "title": "Episode Review Session",
  "description": "Collaborative review of latest episode",
  "plexKey": "/library/metadata/12345",
  "plexServerId": "server_abc",
  "collaborators": [
    "user_456@example.com",
    "user_789@example.com"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "ws_new123",
    "title": "Episode Review Session",
    "processingStatus": "queued",
    "processingProgress": 0,
    "role": "producer",
    "createdAt": "2024-12-18T10:30:00Z"
  }
}
```

#### Get Workspace
```http
GET /api/workspaces/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "ws_123",
    "title": "Episode 5 Cold Open",
    "description": "Reviewing the cold open sequence",
    "contentTitle": "The Office S05E01",
    "contentType": "episode",
    "contentDuration": 1320000,
    "contentPoster": "https://plex.tv/poster.jpg",
    "processingStatus": "complete",
    "processingProgress": 100,
    "role": "producer",
    "producer": {
      "id": "user_123",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "members": [
      {
        "id": "user_456",
        "name": "Jane Smith",
        "role": "collaborator",
        "joinedAt": "2024-12-15T10:00:00Z"
      }
    ],
    "bookmarks": [
      {
        "id": "bm_789",
        "label": "Great reaction shot",
        "startMs": 45000,
        "endMs": 50000,
        "publicNotes": "Perfect for highlights",
        "creator": {
          "id": "user_456",
          "name": "Jane Smith"
        },
        "locked": false,
        "createdAt": "2024-12-16T11:00:00Z"
      }
    ],
    "createdAt": "2024-12-15T09:00:00Z",
    "updatedAt": "2024-12-17T14:30:00Z"
  }
}
```

#### Update Workspace
```http
PUT /api/workspaces/:id
```

**Request:**
```json
{
  "title": "Updated Title",
  "description": "Updated description"
}
```

#### Delete Workspace
```http
DELETE /api/workspaces/:id
```

#### Process Workspace
```http
POST /api/workspaces/:id/process
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "job_456",
    "status": "queued",
    "estimatedDuration": 300
  }
}
```

#### Get Processing Status
```http
GET /api/workspaces/:id/process
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "processing",
    "progress": 75,
    "currentStep": "Generating HLS streams",
    "estimatedTimeRemaining": 60,
    "startedAt": "2024-12-18T10:00:00Z"
  }
}
```

### Bookmarks

#### List Bookmarks
```http
GET /api/bookmarks
```

**Query Parameters:**
- `workspaceId` (string, required) - Workspace ID
- `createdBy` (string) - Filter by creator user ID
- `startTime` (number) - Filter by start time (milliseconds)
- `endTime` (number) - Filter by end time (milliseconds)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "bm_123",
      "workspaceId": "ws_456",
      "label": "Important moment",
      "publicNotes": "Team discussion needed",
      "privateNotes": "My personal note",
      "startMs": 120000,
      "endMs": 135000,
      "locked": false,
      "lockedBy": null,
      "lockedAt": null,
      "creator": {
        "id": "user_789",
        "name": "Alice Johnson"
      },
      "createdAt": "2024-12-17T15:30:00Z",
      "updatedAt": "2024-12-17T15:45:00Z"
    }
  ]
}
```

#### Create Bookmark
```http
POST /api/bookmarks
```

**Request:**
```json
{
  "workspaceId": "ws_456",
  "label": "Key scene",
  "publicNotes": "Great for social media",
  "privateNotes": "Remember to check audio levels",
  "startMs": 180000,
  "endMs": 195000
}
```

#### Update Bookmark
```http
PUT /api/bookmarks/:id
```

**Request:**
```json
{
  "label": "Updated label",
  "publicNotes": "Updated public notes",
  "endMs": 200000
}
```

#### Lock/Unlock Bookmark
```http
PATCH /api/bookmarks/:id/lock
```

**Request:**
```json
{
  "locked": true
}
```

#### Delete Bookmark
```http
DELETE /api/bookmarks/:id
```

### Plex Integration

#### Get Plex Configuration
```http
GET /api/plex/config
```

**Response:**
```json
{
  "success": true,
  "data": {
    "configured": true,
    "serverUrl": "http://192.168.1.100:32400",
    "serverName": "Home Media Server",
    "libraries": [
      {
        "key": "1",
        "title": "Movies",
        "type": "movie"
      },
      {
        "key": "2", 
        "title": "TV Shows",
        "type": "show"
      }
    ]
  }
}
```

#### Update Plex Configuration
```http
POST /api/plex/config
```

**Request:**
```json
{
  "serverUrl": "http://192.168.1.100:32400",
  "serverToken": "xxxxxxxxxxxx"
}
```

#### Test Plex Connection
```http
POST /api/plex/connect
```

**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "serverInfo": {
      "name": "Home Media Server",
      "version": "1.40.1.8227",
      "platform": "Linux"
    }
  }
}
```

#### Get Plex Library Content
```http
GET /api/plex/library
```

**Query Parameters:**
- `libraryKey` (string) - Library section key
- `page` (number) - Page number
- `search` (string) - Search query

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "key": "/library/metadata/12345",
      "title": "The Office",
      "type": "show",
      "thumb": "https://plex.tv/thumb.jpg",
      "art": "https://plex.tv/art.jpg",
      "summary": "A mockumentary...",
      "year": 2005,
      "episodes": [
        {
          "key": "/library/metadata/12346",
          "title": "Pilot",
          "episodeNumber": 1,
          "seasonNumber": 1,
          "duration": 1320000,
          "thumb": "https://plex.tv/episode_thumb.jpg"
        }
      ]
    }
  ]
}
```

#### Get HLS Stream URL
```http
GET /api/plex/hls
```

**Query Parameters:**
- `key` (string, required) - Plex media key
- `quality` (string) - Quality preference: `original` | `1080p` | `720p` | `480p`

**Response:**
```json
{
  "success": true,
  "data": {
    "streamUrl": "https://plex.tv/video/:/transcode/universal/start.m3u8?session=xyz",
    "quality": "1080p",
    "duration": 1320000
  }
}
```

### Downloads and Export

#### Generate Clip Download
```http
POST /api/downloads
```

**Request:**
```json
{
  "bookmarkIds": ["bm_123", "bm_456"],
  "format": "mp4",
  "quality": "1080p"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "download_789",
    "estimatedDuration": 120,
    "clips": [
      {
        "bookmarkId": "bm_123",
        "filename": "workspace_clip_001.mp4",
        "estimatedSize": "25MB"
      }
    ]
  }
}
```

#### Export OBS Package
```http
POST /api/export
```

**Request:**
```json
{
  "workspaceId": "ws_123",
  "format": "mp4",
  "quality": "1080p",
  "hotkeyPattern": "sequential",
  "includeWebInterface": true,
  "theme": "dark"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "export_456",
    "estimatedDuration": 600,
    "packageSize": "250MB",
    "clipsIncluded": 12
  }
}
```

#### Check Job Status
```http
GET /api/jobs/:jobId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "job_123",
    "type": "download",
    "status": "complete",
    "progress": 100,
    "result": {
      "downloadUrl": "https://clipshare.com/downloads/package_xyz.zip",
      "expiresAt": "2024-12-25T10:30:00Z"
    },
    "createdAt": "2024-12-18T10:00:00Z",
    "completedAt": "2024-12-18T10:05:00Z"
  }
}
```

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (resource already exists)
- `422` - Unprocessable Entity (business logic error)
- `500` - Internal Server Error
- `503` - Service Unavailable (maintenance mode)

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "WORKSPACE_NOT_FOUND",
    "message": "The requested workspace does not exist",
    "details": {
      "workspaceId": "ws_invalid",
      "suggestion": "Check the workspace ID and try again"
    }
  },
  "meta": {
    "timestamp": "2024-12-18T10:30:00Z",
    "requestId": "req_123456",
    "path": "/api/workspaces/ws_invalid"
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `AUTHENTICATION_REQUIRED` | Valid session required |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `VALIDATION_ERROR` | Request data validation failed |
| `RESOURCE_NOT_FOUND` | Requested resource doesn't exist |
| `WORKSPACE_PROCESSING` | Operation not allowed during processing |
| `PLEX_CONNECTION_ERROR` | Cannot connect to Plex server |
| `PROCESSING_FAILED` | Background job failed |
| `RATE_LIMIT_EXCEEDED` | Too many requests |

## Rate Limiting

### Limits
- **General API**: 1000 requests per hour per user
- **Processing endpoints**: 10 requests per hour per user
- **Download endpoints**: 50 requests per hour per user

### Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1703764800
```

### Rate Limit Exceeded Response
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 1 hour.",
    "details": {
      "limit": 1000,
      "windowMs": 3600000,
      "retryAfter": 3600
    }
  }
}
```

## Examples

### Complete Workspace Creation Flow

```javascript
// 1. Create workspace
const workspace = await fetch('/api/workspaces', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Sprint Review Session',
    plexKey: '/library/metadata/12345',
    collaborators: ['team@example.com']
  })
})

const { data: workspaceData } = await workspace.json()

// 2. Wait for processing
let processing = true
while (processing) {
  const status = await fetch(`/api/workspaces/${workspaceData.id}/process`)
  const { data: statusData } = await status.json()
  
  if (statusData.status === 'complete') {
    processing = false
  } else if (statusData.status === 'error') {
    throw new Error('Processing failed')
  }
  
  await new Promise(resolve => setTimeout(resolve, 5000))
}

// 3. Create bookmarks
const bookmark = await fetch('/api/bookmarks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workspaceId: workspaceData.id,
    label: 'Key moment',
    startMs: 60000,
    endMs: 75000,
    publicNotes: 'Great for highlights'
  })
})

// 4. Generate download
const download = await fetch('/api/downloads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bookmarkIds: [(await bookmark.json()).data.id],
    format: 'mp4',
    quality: '1080p'
  })
})
```

### Batch Bookmark Creation

```javascript
const bookmarks = [
  { label: 'Opening', startMs: 0, endMs: 15000 },
  { label: 'Key Scene', startMs: 120000, endMs: 180000 },
  { label: 'Closing', startMs: 300000, endMs: 315000 }
]

const created = await Promise.all(
  bookmarks.map(bookmark => 
    fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'ws_123',
        ...bookmark
      })
    }).then(res => res.json())
  )
)
```

### Real-time Bookmark Updates

```javascript
// Using Server-Sent Events for real-time updates
const eventSource = new EventSource('/api/workspaces/ws_123/events')

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  
  switch (data.type) {
    case 'bookmark_created':
      addBookmarkToUI(data.bookmark)
      break
    case 'bookmark_updated':
      updateBookmarkInUI(data.bookmark)
      break
    case 'bookmark_deleted':
      removeBookmarkFromUI(data.bookmarkId)
      break
  }
}
```

## Webhooks

### Configuration

Configure webhooks in your workspace settings to receive real-time notifications:

```javascript
// POST /api/webhooks
{
  "url": "https://your-app.com/clipshare-webhook",
  "events": [
    "workspace.processing.complete",
    "bookmark.created",
    "download.ready"
  ],
  "secret": "your-webhook-secret"
}
```

### Webhook Events

**Workspace Events:**
- `workspace.created`
- `workspace.updated`
- `workspace.deleted`
- `workspace.processing.started`
- `workspace.processing.complete`
- `workspace.processing.failed`

**Bookmark Events:**
- `bookmark.created`
- `bookmark.updated`
- `bookmark.deleted`
- `bookmark.locked`
- `bookmark.unlocked`

**Job Events:**
- `download.started`
- `download.complete`
- `download.failed`
- `export.started`
- `export.complete`
- `export.failed`

### Webhook Payload

```json
{
  "event": "bookmark.created",
  "timestamp": "2024-12-18T10:30:00Z",
  "workspaceId": "ws_123",
  "data": {
    "bookmark": {
      "id": "bm_456",
      "label": "New bookmark",
      "creator": {
        "id": "user_789",
        "name": "Alice Johnson"
      }
    }
  },
  "signature": "sha256=abc123..."
}
```

### Verifying Webhooks

```javascript
const crypto = require('crypto')

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expectedSignature}`)
  )
}
```

## SDKs and Libraries

### JavaScript/TypeScript

```bash
npm install @clipshare/client
```

```typescript
import { ClipshareClient } from '@clipshare/client'

const client = new ClipshareClient({
  baseUrl: 'https://your-clipshare-instance.com',
  auth: {
    type: 'session'  // or 'token'
  }
})

// Type-safe API calls
const workspaces = await client.workspaces.list()
const bookmark = await client.bookmarks.create({
  workspaceId: 'ws_123',
  label: 'Test bookmark',
  startMs: 60000,
  endMs: 75000
})
```

### Python

```bash
pip install clipshare-python
```

```python
from clipshare import ClipshareClient

client = ClipshareClient(
    base_url='https://your-clipshare-instance.com',
    session_token='your-session-token'
)

# Create workspace
workspace = client.workspaces.create(
    title='Python API Test',
    plex_key='/library/metadata/12345'
)

# Create bookmark
bookmark = client.bookmarks.create(
    workspace_id=workspace.id,
    label='Python bookmark',
    start_ms=60000,
    end_ms=75000
)
```

## API Versioning

### Current Version
- **Version**: 1.0
- **Stability**: Stable
- **Support**: Active development

### Version Strategy
- **Backward compatibility** maintained within major versions
- **Deprecation notices** provided 6 months before removal
- **Migration guides** provided for breaking changes

### Future Versions
- `v2` - Planned features: GraphQL support, enhanced real-time capabilities
- Timeline: Q2 2025

---

For more information, see:
- [Development Guide](./DEVELOPMENT.md) - Setting up development environment
- [User Guide](./USER_GUIDE.md) - End-user documentation
- [Troubleshooting](./TROUBLESHOOTING.md) - Common API issues