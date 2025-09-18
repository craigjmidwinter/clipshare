import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    workspace: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    video: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    processingJob: {
      create: vi.fn()
    },
    user: {
      findMany: vi.fn()
    }
  }
}))

vi.mock('@/lib/data-dirs', () => ({
  getProcessedFilesDir: vi.fn(() => '/test/processed-files')
}))

vi.mock('@/lib/video-processing-service', () => ({
  VideoProcessingService: {
    getInstance: vi.fn(() => ({
      processVideo: vi.fn().mockResolvedValue(undefined)
    }))
  }
}))

vi.mock('fs', async () => {
  const actual = await vi.importActual('fs')
  return {
    ...actual,
    promises: {
      mkdir: vi.fn(),
      writeFile: vi.fn(),
      readFile: vi.fn()
    }
  }
})

describe('/api/workspaces/[id]/videos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/workspaces/test-id/videos')
      const response = await GET(request, { params: Promise.resolve({ id: 'test-id' }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if workspace not found', async () => {
      const { getServerSession } = await import('next-auth')
      const { prisma } = await import('@/lib/prisma')
      
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } })
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/workspaces/test-id/videos')
      const response = await GET(request, { params: Promise.resolve({ id: 'test-id' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Workspace not found')
    })

    it('should return videos for authenticated user with workspace access', async () => {
      const { getServerSession } = await import('next-auth')
      const { prisma } = await import('@/lib/prisma')
      
      const mockWorkspace = {
        id: 'workspace-1',
        producerId: 'user-1',
        memberships: [{ userId: 'user-1' }]
      }
      
      const mockVideos = [
        {
          id: 'video-1',
          title: 'Test Video',
          isPublicToWorkspace: true,
          addedBy: { id: 'user-1', name: 'Test User' }
        }
      ]

      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } })
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace)
      vi.mocked(prisma.video.findMany).mockResolvedValue(mockVideos)

      const request = new NextRequest('http://localhost:3000/api/workspaces/workspace-1/videos')
      const response = await GET(request, { params: Promise.resolve({ id: 'workspace-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.videos).toEqual(mockVideos)
    })
  })

  describe('POST', () => {
    it('should return 401 if user is not authenticated', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(null)

      const mockFormData = {
        get: vi.fn().mockImplementation((key: string) => {
          const values: Record<string, string> = {
            'title': 'Test Video',
            'sourceType': 'upload'
          }
          return values[key] || null
        })
      }

      const request = {
        formData: vi.fn().mockResolvedValue(mockFormData)
      } as any
      
      const response = await POST(request, { params: Promise.resolve({ id: 'test-id' }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if required fields are missing', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } })

      const mockFormData = {
        get: vi.fn().mockReturnValue(null) // Missing sourceType
      }

      const request = {
        formData: vi.fn().mockResolvedValue(mockFormData)
      } as any
      
      const response = await POST(request, { params: Promise.resolve({ id: 'test-id' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required fields')
    })

    it('should create video for YouTube URL', async () => {
      const { getServerSession } = await import('next-auth')
      const { prisma } = await import('@/lib/prisma')
      
      const mockWorkspace = {
        id: 'workspace-1',
        producerId: 'user-1',
        memberships: [{ userId: 'user-1' }]
      }

      const mockVideo = {
        id: 'video-1',
        title: 'YouTube Video',
        sourceType: 'youtube',
        sourceUrl: 'https://www.youtube.com/watch?v=test',
        addedById: 'user-1',
        addedBy: { id: 'user-1', name: 'Test User' }
      }

      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } })
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace)
      vi.mocked(prisma.video.create).mockResolvedValue(mockVideo)
      vi.mocked(prisma.processingJob.create).mockResolvedValue({ id: 'job-1' })

      const mockFormData = {
        get: vi.fn().mockImplementation((key: string) => {
          const values: Record<string, string> = {
            'title': 'YouTube Video',
            'sourceType': 'youtube',
            'sourceUrl': 'https://www.youtube.com/watch?v=test',
            'isPublicToWorkspace': 'true',
            'accessControlWarned': 'true'
          }
          return values[key] || null
        })
      }

      const request = {
        formData: vi.fn().mockResolvedValue(mockFormData)
      } as any
      
      const response = await POST(request, { params: Promise.resolve({ id: 'workspace-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.video).toEqual(mockVideo)
      expect(data.processingStarted).toBe(true)
    })

    it('should create video for YouTube URL without title', async () => {
      const { getServerSession } = await import('next-auth')
      const { prisma } = await import('@/lib/prisma')
      
      const mockWorkspace = {
        id: 'workspace-1',
        producerId: 'user-1',
        memberships: [{ userId: 'user-1' }]
      }

      const mockVideo = {
        id: 'video-1',
        title: 'Processing YouTube video...', // Default title for YouTube videos
        sourceType: 'youtube',
        sourceUrl: 'https://www.youtube.com/watch?v=test',
        addedById: 'user-1',
        addedBy: { id: 'user-1', name: 'Test User' }
      }

      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } })
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace)
      vi.mocked(prisma.video.create).mockResolvedValue(mockVideo)
      vi.mocked(prisma.processingJob.create).mockResolvedValue({ id: 'job-1' })

      const mockFormData = {
        get: vi.fn().mockImplementation((key: string) => {
          const values: Record<string, string> = {
            'sourceType': 'youtube',
            'sourceUrl': 'https://www.youtube.com/watch?v=test',
            'isPublicToWorkspace': 'true',
            'accessControlWarned': 'true'
            // No title provided - should use default
          }
          return values[key] || null
        })
      }

      const request = {
        formData: vi.fn().mockResolvedValue(mockFormData)
      } as any
      
      const response = await POST(request, { params: Promise.resolve({ id: 'workspace-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.video.title).toBe('Processing YouTube video...')
      expect(data.processingStarted).toBe(true)
    })
  })
})
