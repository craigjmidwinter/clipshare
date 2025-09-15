import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from './route'
import { prisma } from '@/lib/prisma'

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    workspace: {
      findUnique: vi.fn(),
      findMany: vi.fn()
    },
    bookmark: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  }
}))

const mockSession = {
  user: {
    id: 'user-1',
    name: 'Test User',
    plexUsername: 'testuser'
  }
}

const mockWorkspace = {
  id: 'workspace-1',
  producerId: 'user-1',
  contentDuration: 3600000, // 1 hour
  memberships: [
    {
      userId: 'user-1',
      role: 'producer'
    }
  ]
}

const mockBookmark = {
  id: 'bookmark-1',
  workspaceId: 'workspace-1',
  createdById: 'user-1',
  label: 'Test Bookmark',
  publicNotes: 'Public notes',
  privateNotes: 'Private notes',
  startMs: 10000,
  endMs: 20000,
  publicSlug: 'slug-1',
  isPublicRevoked: false,
  createdAt: '2025-09-15T02:12:11.983Z',
  updatedAt: '2025-09-15T02:12:11.983Z',
  createdBy: {
    id: 'user-1',
    name: 'Test User',
    plexUsername: 'testuser',
    plexAvatarUrl: null
  }
}

describe('Bookmarks API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/bookmarks', () => {
    it('should return 401 if user is not authenticated', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/bookmarks?workspaceId=workspace-1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if workspaceId is missing', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/bookmarks')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Workspace ID is required')
    })

    it('should return 404 if workspace is not found', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/bookmarks?workspaceId=workspace-1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Workspace not found')
    })

    it('should return 403 if user does not have access to workspace', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ...mockWorkspace,
        producerId: 'other-user',
        memberships: []
      })

      const request = new NextRequest('http://localhost:3000/api/bookmarks?workspaceId=workspace-1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied')
    })

    it('should return bookmarks for accessible workspace', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace)
      vi.mocked(prisma.bookmark.findMany).mockResolvedValue([mockBookmark])

      const request = new NextRequest('http://localhost:3000/api/bookmarks?workspaceId=workspace-1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.bookmarks).toEqual([mockBookmark])
    })
  })

  describe('POST /api/bookmarks', () => {
    it('should return 401 if user is not authenticated', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/bookmarks', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId: 'workspace-1',
          startMs: 10000,
          endMs: 20000
        })
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if required fields are missing', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/bookmarks', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId: 'workspace-1'
        })
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Workspace ID, start time, and end time are required')
    })

    it('should return 400 if start time is greater than or equal to end time', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/bookmarks', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId: 'workspace-1',
          startMs: 20000,
          endMs: 10000
        })
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Start time must be less than end time')
    })

    it('should return 400 if bookmark times are outside content duration', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace)

      const request = new NextRequest('http://localhost:3000/api/bookmarks', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId: 'workspace-1',
          startMs: -1000,
          endMs: 20000
        })
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Bookmark times must be within content duration')
    })

    it('should create bookmark successfully', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace)
      vi.mocked(prisma.bookmark.create).mockResolvedValue(mockBookmark)

      const request = new NextRequest('http://localhost:3000/api/bookmarks', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId: 'workspace-1',
          label: 'Test Bookmark',
          publicNotes: 'Public notes',
          privateNotes: 'Private notes',
          startMs: 10000,
          endMs: 20000
        })
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.bookmark).toEqual(mockBookmark)
    })
  })

  describe('PUT /api/bookmarks', () => {
    it('should return 401 if user is not authenticated', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/bookmarks', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'bookmark-1',
          label: 'Updated Label'
        })
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if bookmark ID is missing', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/bookmarks', {
        method: 'PUT',
        body: JSON.stringify({
          label: 'Updated Label'
        })
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Bookmark ID is required')
    })

    it('should return 404 if bookmark is not found', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.bookmark.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/bookmarks', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'bookmark-1',
          label: 'Updated Label'
        })
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Bookmark not found')
    })

    it('should return 403 if user cannot edit bookmark', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'other-user' }
      })
      vi.mocked(prisma.bookmark.findUnique).mockResolvedValue({
        ...mockBookmark,
        createdById: 'user-1',
        workspace: {
          ...mockWorkspace,
          producerId: 'user-1',
          memberships: [{ userId: 'other-user', role: 'collaborator' }]
        }
      })

      const request = new NextRequest('http://localhost:3000/api/bookmarks', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'bookmark-1',
          label: 'Updated Label'
        })
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only bookmark creator or producer can edit')
    })

    it('should update bookmark successfully', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.bookmark.findUnique).mockResolvedValue({
        ...mockBookmark,
        workspace: mockWorkspace
      })
      vi.mocked(prisma.bookmark.update).mockResolvedValue({
        ...mockBookmark,
        label: 'Updated Label'
      })

      const request = new NextRequest('http://localhost:3000/api/bookmarks', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'bookmark-1',
          label: 'Updated Label'
        })
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.bookmark.label).toBe('Updated Label')
    })
  })

  describe('DELETE /api/bookmarks', () => {
    it('should return 401 if user is not authenticated', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/bookmarks?id=bookmark-1')
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if bookmark ID is missing', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/bookmarks')
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Bookmark ID is required')
    })

    it('should return 404 if bookmark is not found', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.bookmark.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/bookmarks?id=bookmark-1')
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Bookmark not found')
    })

    it('should return 403 if user cannot delete bookmark', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'other-user' }
      })
      vi.mocked(prisma.bookmark.findUnique).mockResolvedValue({
        ...mockBookmark,
        createdById: 'user-1',
        workspace: {
          ...mockWorkspace,
          producerId: 'user-1',
          memberships: [{ userId: 'other-user', role: 'collaborator' }]
        }
      })

      const request = new NextRequest('http://localhost:3000/api/bookmarks?id=bookmark-1')
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only bookmark creator or producer can delete')
    })

    it('should delete bookmark successfully', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.bookmark.findUnique).mockResolvedValue({
        ...mockBookmark,
        workspace: mockWorkspace
      })
      vi.mocked(prisma.bookmark.delete).mockResolvedValue(mockBookmark)

      const request = new NextRequest('http://localhost:3000/api/bookmarks?id=bookmark-1')
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})
