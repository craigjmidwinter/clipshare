import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { DELETE } from './route'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    workspace: {
      findUnique: vi.fn()
    },
    video: {
      findUnique: vi.fn(),
      delete: vi.fn()
    }
  }
}))

vi.mock('@/lib/data-dirs', () => ({
  getProcessedFilesDir: vi.fn(() => '/test/processed-files')
}))

vi.mock('fs', async () => {
  const actual = await vi.importActual('fs')
  return {
    ...actual,
    promises: {
      access: vi.fn(),
      rm: vi.fn()
    }
  }
})

describe('/api/workspaces/[id]/videos/[videoId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('DELETE', () => {
    it('should return 401 if user is not authenticated', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/workspaces/test-id/videos/video-1')
      const response = await DELETE(request, { params: Promise.resolve({ id: 'test-id', videoId: 'video-1' }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if workspace not found', async () => {
      const { getServerSession } = await import('next-auth')
      const { prisma } = await import('@/lib/prisma')
      
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } })
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/workspaces/test-id/videos/video-1')
      const response = await DELETE(request, { params: Promise.resolve({ id: 'test-id', videoId: 'video-1' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Workspace not found')
    })

    it('should return 403 if user does not have workspace access', async () => {
      const { getServerSession } = await import('next-auth')
      const { prisma } = await import('@/lib/prisma')
      
      const mockWorkspace = {
        id: 'workspace-1',
        producerId: 'user-2', // Different user
        memberships: [{ userId: 'user-2' }] // User 1 not in memberships
      }

      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } })
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace)

      const request = new NextRequest('http://localhost:3000/api/workspaces/workspace-1/videos/video-1')
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workspace-1', videoId: 'video-1' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied')
    })

    it('should return 404 if video not found', async () => {
      const { getServerSession } = await import('next-auth')
      const { prisma } = await import('@/lib/prisma')
      
      const mockWorkspace = {
        id: 'workspace-1',
        producerId: 'user-1',
        memberships: [{ userId: 'user-1' }]
      }

      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } })
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace)
      vi.mocked(prisma.video.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/workspaces/workspace-1/videos/video-1')
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workspace-1', videoId: 'video-1' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Video not found')
    })

    it('should return 403 if user cannot delete video (not owner or producer)', async () => {
      const { getServerSession } = await import('next-auth')
      const { prisma } = await import('@/lib/prisma')
      
      const mockWorkspace = {
        id: 'workspace-1',
        producerId: 'user-2', // Different producer
        memberships: [{ userId: 'user-1' }] // User 1 is collaborator
      }

      const mockVideo = {
        id: 'video-1',
        workspaceId: 'workspace-1',
        addedById: 'user-3', // Different user added the video
        workspace: mockWorkspace
      }

      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } })
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace)
      vi.mocked(prisma.video.findUnique).mockResolvedValue(mockVideo)

      const request = new NextRequest('http://localhost:3000/api/workspaces/workspace-1/videos/video-1')
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workspace-1', videoId: 'video-1' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('You can only delete videos you added or if you\'re the workspace producer')
    })

    it('should successfully delete video when user is the video owner', async () => {
      const { getServerSession } = await import('next-auth')
      const { prisma } = await import('@/lib/prisma')
      const { promises: fs } = await import('fs')
      
      const mockWorkspace = {
        id: 'workspace-1',
        producerId: 'user-2',
        memberships: [{ userId: 'user-1' }]
      }

      const mockVideo = {
        id: 'video-1',
        workspaceId: 'workspace-1',
        addedById: 'user-1', // User 1 added the video
        workspace: mockWorkspace
      }

      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } })
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace)
      vi.mocked(prisma.video.findUnique).mockResolvedValue(mockVideo)
      vi.mocked(prisma.video.delete).mockResolvedValue(mockVideo)
      vi.mocked(fs.access).mockResolvedValue(undefined) // Directory exists
      vi.mocked(fs.rm).mockResolvedValue(undefined) // Successfully deleted

      const request = new NextRequest('http://localhost:3000/api/workspaces/workspace-1/videos/video-1')
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workspace-1', videoId: 'video-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Video deleted successfully')
      expect(prisma.video.delete).toHaveBeenCalledWith({ where: { id: 'video-1' } })
    })

    it('should successfully delete video when user is workspace producer', async () => {
      const { getServerSession } = await import('next-auth')
      const { prisma } = await import('@/lib/prisma')
      const { promises: fs } = await import('fs')
      
      const mockWorkspace = {
        id: 'workspace-1',
        producerId: 'user-1', // User 1 is producer
        memberships: [{ userId: 'user-1' }]
      }

      const mockVideo = {
        id: 'video-1',
        workspaceId: 'workspace-1',
        addedById: 'user-2', // Different user added the video
        workspace: mockWorkspace
      }

      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } })
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace)
      vi.mocked(prisma.video.findUnique).mockResolvedValue(mockVideo)
      vi.mocked(prisma.video.delete).mockResolvedValue(mockVideo)
      vi.mocked(fs.access).mockResolvedValue(undefined) // Directory exists
      vi.mocked(fs.rm).mockResolvedValue(undefined) // Successfully deleted

      const request = new NextRequest('http://localhost:3000/api/workspaces/workspace-1/videos/video-1')
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workspace-1', videoId: 'video-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Video deleted successfully')
      expect(prisma.video.delete).toHaveBeenCalledWith({ where: { id: 'video-1' } })
    })

    it('should continue with database deletion even if file deletion fails', async () => {
      const { getServerSession } = await import('next-auth')
      const { prisma } = await import('@/lib/prisma')
      const { promises: fs } = await import('fs')
      
      const mockWorkspace = {
        id: 'workspace-1',
        producerId: 'user-1',
        memberships: [{ userId: 'user-1' }]
      }

      const mockVideo = {
        id: 'video-1',
        workspaceId: 'workspace-1',
        addedById: 'user-1',
        workspace: mockWorkspace
      }

      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } })
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace)
      vi.mocked(prisma.video.findUnique).mockResolvedValue(mockVideo)
      vi.mocked(prisma.video.delete).mockResolvedValue(mockVideo)
      vi.mocked(fs.access).mockRejectedValue(new Error('Directory not found')) // File deletion fails

      const request = new NextRequest('http://localhost:3000/api/workspaces/workspace-1/videos/video-1')
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workspace-1', videoId: 'video-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Video deleted successfully')
      expect(prisma.video.delete).toHaveBeenCalledWith({ where: { id: 'video-1' } })
    })

    it('should return 500 if database deletion fails', async () => {
      const { getServerSession } = await import('next-auth')
      const { prisma } = await import('@/lib/prisma')
      
      const mockWorkspace = {
        id: 'workspace-1',
        producerId: 'user-1',
        memberships: [{ userId: 'user-1' }]
      }

      const mockVideo = {
        id: 'video-1',
        workspaceId: 'workspace-1',
        addedById: 'user-1',
        workspace: mockWorkspace
      }

      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } })
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace)
      vi.mocked(prisma.video.findUnique).mockResolvedValue(mockVideo)
      vi.mocked(prisma.video.delete).mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/workspaces/workspace-1/videos/video-1')
      const response = await DELETE(request, { params: Promise.resolve({ id: 'workspace-1', videoId: 'video-1' }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete video')
    })
  })
})
