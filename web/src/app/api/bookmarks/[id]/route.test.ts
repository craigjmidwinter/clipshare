import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PUT, DELETE } from './route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    bookmark: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  }
}))

const mockGetServerSession = vi.mocked(getServerSession)
const mockPrisma = vi.mocked(prisma)

describe('/api/bookmarks/[id]', () => {
  const mockSession = {
    user: {
      id: 'user1',
      name: 'Test User',
      email: 'test@example.com'
    }
  }

  const mockWorkspace = {
    id: 'workspace1',
    producerId: 'user1',
    memberships: [{ userId: 'user1' }]
  }

  const mockBookmark = {
    id: 'bookmark1',
    workspaceId: 'workspace1',
    createdById: 'user1',
    label: 'Test Bookmark',
    startMs: 1000,
    endMs: 5000,
    lockedById: null,
    lockedAt: null,
    workspace: mockWorkspace,
    createdBy: {
      id: 'user1',
      name: 'Test User',
      plexUsername: 'testuser',
      plexAvatarUrl: null
    },
    lockedBy: null
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetServerSession.mockResolvedValue(mockSession as any)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('GET /api/bookmarks/[id]', () => {
    it('should return bookmark for authorized user', async () => {
      mockPrisma.bookmark.findUnique.mockResolvedValue(mockBookmark as any)

      const request = new NextRequest('http://localhost:3000/api/bookmarks/bookmark1')
      const response = await GET(request, { params: { id: 'bookmark1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.bookmark).toEqual(mockBookmark)
    })

    it('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/bookmarks/bookmark1')
      const response = await GET(request, { params: { id: 'bookmark1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 for non-existent bookmark', async () => {
      mockPrisma.bookmark.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/bookmarks/nonexistent')
      const response = await GET(request, { params: { id: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Bookmark not found')
    })

    it('should return 403 for user without workspace access', async () => {
      const collaboratorSession = {
        user: {
          id: 'user2',
          name: 'Collaborator',
          email: 'collaborator@example.com'
        }
      }
      mockGetServerSession.mockResolvedValue(collaboratorSession as any)

      const bookmarkWithoutAccess = {
        ...mockBookmark,
        workspace: {
          ...mockWorkspace,
          producerId: 'user1', // Different producer
          memberships: [] // No memberships for user2
        }
      }
      mockPrisma.bookmark.findUnique.mockResolvedValue(bookmarkWithoutAccess as any)

      const request = new NextRequest('http://localhost:3000/api/bookmarks/bookmark1')
      const response = await GET(request, { params: { id: 'bookmark1' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied')
    })
  })

  describe('PUT /api/bookmarks/[id]', () => {
    it('should lock bookmark for producer', async () => {
      const updatedBookmark = {
        ...mockBookmark,
        lockedById: 'user1',
        lockedAt: new Date()
      }
      mockPrisma.bookmark.findUnique.mockResolvedValue(mockBookmark as any)
      mockPrisma.bookmark.update.mockResolvedValue(updatedBookmark as any)

      const request = new NextRequest('http://localhost:3000/api/bookmarks/bookmark1', {
        method: 'PUT',
        body: JSON.stringify({ isLocked: true })
      })
      const response = await PUT(request, { params: { id: 'bookmark1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Bookmark locked')
      expect(mockPrisma.bookmark.update).toHaveBeenCalledWith({
        where: { id: 'bookmark1' },
        data: {
          updatedAt: expect.any(Date),
          lockedById: 'user1',
          lockedAt: expect.any(Date)
        },
        include: expect.any(Object)
      })
    })

    it('should unlock bookmark for producer', async () => {
      const lockedBookmark = {
        ...mockBookmark,
        lockedById: 'user1',
        lockedAt: new Date()
      }
      const unlockedBookmark = {
        ...mockBookmark,
        lockedById: null,
        lockedAt: null
      }
      mockPrisma.bookmark.findUnique.mockResolvedValue(lockedBookmark as any)
      mockPrisma.bookmark.update.mockResolvedValue(unlockedBookmark as any)

      const request = new NextRequest('http://localhost:3000/api/bookmarks/bookmark1', {
        method: 'PUT',
        body: JSON.stringify({ isLocked: false })
      })
      const response = await PUT(request, { params: { id: 'bookmark1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Bookmark unlocked')
    })

    it('should return 403 when non-producer tries to lock bookmark', async () => {
      const collaboratorSession = {
        user: {
          id: 'user2',
          name: 'Collaborator',
          email: 'collaborator@example.com'
        }
      }
      mockGetServerSession.mockResolvedValue(collaboratorSession as any)

      const bookmarkWithCollaboratorAccess = {
        ...mockBookmark,
        workspace: {
          ...mockWorkspace,
          producerId: 'user1',
          memberships: [{ userId: 'user2' }]
        }
      }
      mockPrisma.bookmark.findUnique.mockResolvedValue(bookmarkWithCollaboratorAccess as any)

      const request = new NextRequest('http://localhost:3000/api/bookmarks/bookmark1', {
        method: 'PUT',
        body: JSON.stringify({ isLocked: true })
      })
      const response = await PUT(request, { params: { id: 'bookmark1' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only producers can lock/unlock bookmarks')
    })

    it('should update bookmark label for creator', async () => {
      const updatedBookmark = {
        ...mockBookmark,
        label: 'Updated Label'
      }
      mockPrisma.bookmark.findUnique.mockResolvedValue(mockBookmark as any)
      mockPrisma.bookmark.update.mockResolvedValue(updatedBookmark as any)

      const request = new NextRequest('http://localhost:3000/api/bookmarks/bookmark1', {
        method: 'PUT',
        body: JSON.stringify({ label: 'Updated Label' })
      })
      const response = await PUT(request, { params: { id: 'bookmark1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.bookmark.label).toBe('Updated Label')
    })

    it('should return 403 when trying to edit locked bookmark as non-producer', async () => {
      const collaboratorSession = {
        user: {
          id: 'user2',
          name: 'Collaborator',
          email: 'collaborator@example.com'
        }
      }
      mockGetServerSession.mockResolvedValue(collaboratorSession as any)

      const lockedBookmark = {
        ...mockBookmark,
        lockedById: 'user1',
        lockedAt: new Date(),
        workspace: {
          ...mockWorkspace,
          producerId: 'user1',
          memberships: [{ userId: 'user2' }]
        }
      }
      mockPrisma.bookmark.findUnique.mockResolvedValue(lockedBookmark as any)

      const request = new NextRequest('http://localhost:3000/api/bookmarks/bookmark1', {
        method: 'PUT',
        body: JSON.stringify({ label: 'Updated Label' })
      })
      const response = await PUT(request, { params: { id: 'bookmark1' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Bookmark is locked and cannot be edited')
    })

    it('should allow producer to edit locked bookmark', async () => {
      const lockedBookmark = {
        ...mockBookmark,
        lockedById: 'user1',
        lockedAt: new Date()
      }
      const updatedBookmark = {
        ...lockedBookmark,
        label: 'Updated by Producer'
      }
      mockPrisma.bookmark.findUnique.mockResolvedValue(lockedBookmark as any)
      mockPrisma.bookmark.update.mockResolvedValue(updatedBookmark as any)

      const request = new NextRequest('http://localhost:3000/api/bookmarks/bookmark1', {
        method: 'PUT',
        body: JSON.stringify({ label: 'Updated by Producer' })
      })
      const response = await PUT(request, { params: { id: 'bookmark1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.bookmark.label).toBe('Updated by Producer')
    })
  })

  describe('DELETE /api/bookmarks/[id]', () => {
    it('should delete bookmark for creator', async () => {
      mockPrisma.bookmark.findUnique.mockResolvedValue(mockBookmark as any)
      mockPrisma.bookmark.delete.mockResolvedValue(mockBookmark as any)

      const request = new NextRequest('http://localhost:3000/api/bookmarks/bookmark1', {
        method: 'DELETE'
      })
      const response = await DELETE(request, { params: { id: 'bookmark1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Bookmark deleted')
      expect(mockPrisma.bookmark.delete).toHaveBeenCalledWith({
        where: { id: 'bookmark1' }
      })
    })

    it('should delete bookmark for producer', async () => {
      const producerSession = {
        user: {
          id: 'user1',
          name: 'Producer',
          email: 'producer@example.com'
        }
      }
      mockGetServerSession.mockResolvedValue(producerSession as any)

      const bookmarkByOtherUser = {
        ...mockBookmark,
        createdById: 'user2',
        workspace: {
          ...mockWorkspace,
          producerId: 'user1'
        }
      }
      mockPrisma.bookmark.findUnique.mockResolvedValue(bookmarkByOtherUser as any)
      mockPrisma.bookmark.delete.mockResolvedValue(bookmarkByOtherUser as any)

      const request = new NextRequest('http://localhost:3000/api/bookmarks/bookmark1', {
        method: 'DELETE'
      })
      const response = await DELETE(request, { params: { id: 'bookmark1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Bookmark deleted')
    })

    it('should return 403 when non-creator tries to delete bookmark', async () => {
      const collaboratorSession = {
        user: {
          id: 'user2',
          name: 'Collaborator',
          email: 'collaborator@example.com'
        }
      }
      mockGetServerSession.mockResolvedValue(collaboratorSession as any)

      const bookmarkByOtherUser = {
        ...mockBookmark,
        createdById: 'user1',
        workspace: {
          ...mockWorkspace,
          producerId: 'user3',
          memberships: [{ userId: 'user2' }]
        }
      }
      mockPrisma.bookmark.findUnique.mockResolvedValue(bookmarkByOtherUser as any)

      const request = new NextRequest('http://localhost:3000/api/bookmarks/bookmark1', {
        method: 'DELETE'
      })
      const response = await DELETE(request, { params: { id: 'bookmark1' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only bookmark creator or producer can delete')
    })

    it('should return 403 when trying to delete locked bookmark as non-producer', async () => {
      const collaboratorSession = {
        user: {
          id: 'user2',
          name: 'Collaborator',
          email: 'collaborator@example.com'
        }
      }
      mockGetServerSession.mockResolvedValue(collaboratorSession as any)

      const lockedBookmark = {
        ...mockBookmark,
        createdById: 'user2',
        lockedById: 'user1',
        lockedAt: new Date(),
        workspace: {
          ...mockWorkspace,
          producerId: 'user1',
          memberships: [{ userId: 'user2' }]
        }
      }
      mockPrisma.bookmark.findUnique.mockResolvedValue(lockedBookmark as any)

      const request = new NextRequest('http://localhost:3000/api/bookmarks/bookmark1', {
        method: 'DELETE'
      })
      const response = await DELETE(request, { params: { id: 'bookmark1' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Locked bookmarks can only be deleted by the producer')
    })

    it('should allow producer to delete locked bookmark', async () => {
      const lockedBookmark = {
        ...mockBookmark,
        lockedById: 'user1',
        lockedAt: new Date()
      }
      mockPrisma.bookmark.findUnique.mockResolvedValue(lockedBookmark as any)
      mockPrisma.bookmark.delete.mockResolvedValue(lockedBookmark as any)

      const request = new NextRequest('http://localhost:3000/api/bookmarks/bookmark1', {
        method: 'DELETE'
      })
      const response = await DELETE(request, { params: { id: 'bookmark1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Bookmark deleted')
    })
  })
})
