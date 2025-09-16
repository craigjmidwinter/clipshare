import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from './route'
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
      update: vi.fn()
    },
    processingJob: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    }
  }
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {}
}))

describe('/api/workspaces/[id]/process', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock setTimeout to avoid actual delays in tests
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('POST', () => {
    it('should start workspace processing for producer', async () => {
      const mockSession = { user: { id: 'user1' } }
      const mockWorkspace = {
        id: 'workspace1',
        producerId: 'user1',
        processingStatus: 'pending',
        plexKey: 'plex-key',
        plexServerId: 'server1',
        contentTitle: 'Test Content'
      }
      const mockProcessingJob = {
        id: 'job1',
        workspaceId: 'workspace1',
        type: 'workspace_processing',
        status: 'pending',
        payloadJson: '{}',
        progressPercent: 0
      }

      vi.mocked(require('next-auth').getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace)
      vi.mocked(prisma.processingJob.create).mockResolvedValue(mockProcessingJob)
      vi.mocked(prisma.workspace.update).mockResolvedValue({})

      const request = new NextRequest('http://localhost:3000/api/workspaces/workspace1/process', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: 'workspace1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Processing started')
      expect(data.jobId).toBe('job1')
      expect(prisma.processingJob.create).toHaveBeenCalledWith({
        data: {
          workspaceId: 'workspace1',
          type: 'workspace_processing',
          status: 'pending',
          payloadJson: JSON.stringify({
            plexKey: 'plex-key',
            plexServerId: 'server1',
            contentTitle: 'Test Content'
          }),
          progressPercent: 0
        }
      })
      expect(prisma.workspace.update).toHaveBeenCalledWith({
        where: { id: 'workspace1' },
        data: {
          processingStatus: 'processing',
          processingProgress: 0
        }
      })
    })

    it('should reject non-producer users', async () => {
      const mockSession = { user: { id: 'user2' } }
      const mockWorkspace = {
        id: 'workspace1',
        producerId: 'user1',
        processingStatus: 'pending'
      }

      vi.mocked(require('next-auth').getServerSession).mockResolvedValue(mockSession)
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace)

      const request = new NextRequest('http://localhost:3000/api/workspaces/workspace1/process', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: 'workspace1' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only the producer can process this workspace')
    })

    it('should reject if workspace is already processing', async () => {
      const mockSession = { user: { id: 'user1' } }
      const mockWorkspace = {
        id: 'workspace1',
        producerId: 'user1',
        processingStatus: 'processing'
      }

      vi.mocked(require('next-auth').getServerSession).mockResolvedValue(mockSession)
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace)

      const request = new NextRequest('http://localhost:3000/api/workspaces/workspace1/process', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: 'workspace1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Workspace is already being processed')
    })

    it('should return 401 for unauthenticated users', async () => {
      vi.mocked(require('next-auth').getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/workspaces/workspace1/process', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: 'workspace1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('GET', () => {
    it('should return processing status for workspace member', async () => {
      const mockSession = { user: { id: 'user1' } }
      const mockWorkspace = {
        id: 'workspace1',
        producerId: 'user1',
        processingStatus: 'processing',
        processingProgress: 50,
        memberships: []
      }
      const mockJob = {
        id: 'job1',
        status: 'processing',
        progressPercent: 50,
        errorText: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.mocked(require('next-auth').getServerSession).mockResolvedValue(mockSession)
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace)
      prisma.processingJob.findFirst.mockResolvedValue(mockJob)

      const request = new NextRequest('http://localhost:3000/api/workspaces/workspace1/process', {
        method: 'GET'
      })

      const response = await GET(request, { params: { id: 'workspace1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processingStatus).toBe('processing')
      expect(data.processingProgress).toBe(50)
      expect(data.latestJob).toEqual({
        id: 'job1',
        status: 'processing',
        progressPercent: 50,
        errorText: null,
        createdAt: mockJob.createdAt,
        updatedAt: mockJob.updatedAt
      })
    })

    it('should return 403 for non-members', async () => {
      const mockSession = { user: { id: 'user2' } }
      const mockWorkspace = {
        id: 'workspace1',
        producerId: 'user1',
        processingStatus: 'processing',
        processingProgress: 50,
        memberships: []
      }

      vi.mocked(require('next-auth').getServerSession).mockResolvedValue(mockSession)
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace)

      const request = new NextRequest('http://localhost:3000/api/workspaces/workspace1/process', {
        method: 'GET'
      })

      const response = await GET(request, { params: { id: 'workspace1' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied')
    })
  })
})
