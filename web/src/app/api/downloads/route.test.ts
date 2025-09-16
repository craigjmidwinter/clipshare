import { describe, it, expect, beforeEach, vi } from 'vitest'
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
      findUnique: vi.fn()
    },
    bookmark: {
      findMany: vi.fn()
    },
    processingJob: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    }
  }
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {}
}))

describe('/api/downloads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST', () => {
    it('should start download for workspace member', async () => {
      const mockSession = { user: { id: 'user1' } }
      const mockWorkspace = {
        id: 'workspace1',
        producerId: 'user1',
        processingStatus: 'completed',
        memberships: []
      }
      const mockBookmarks = [
        {
          id: 'bookmark1',
          label: 'Test Bookmark',
          startMs: 1000,
          endMs: 5000,
          workspace: {
            title: 'Test Workspace',
            contentTitle: 'Test Content'
          }
        }
      ]
      const mockJob = {
        id: 'job1',
        workspaceId: 'workspace1',
        type: 'download_clip',
        status: 'pending',
        payloadJson: '{}',
        progressPercent: 0
      }

      vi.mocked(require('next-auth').getServerSession).mockResolvedValue(mockSession)
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace)
      prisma.bookmark.findMany.mockResolvedValue(mockBookmarks)
      prisma.processingJob.create.mockResolvedValue(mockJob)

      const request = new NextRequest('http://localhost:3000/api/downloads', {
        method: 'POST',
        body: JSON.stringify({
          bookmarkIds: ['bookmark1'],
          workspaceId: 'workspace1',
          bulkDownload: false
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Download started')
      expect(data.jobIds).toEqual(['job1'])
      expect(prisma.processingJob.create).toHaveBeenCalledWith({
        data: {
          workspaceId: 'workspace1',
          type: 'download_clip',
          status: 'pending',
          payloadJson: JSON.stringify({
            bookmarkId: 'bookmark1',
            bookmarkLabel: 'Test Bookmark',
            startMs: 1000,
            endMs: 5000,
            workspaceTitle: 'Test Workspace',
            contentTitle: 'Test Content',
            bulkDownload: false
          }),
          progressPercent: 0
        }
      })
    })

    it('should reject download if workspace processing not completed', async () => {
      const mockSession = { user: { id: 'user1' } }
      const mockWorkspace = {
        id: 'workspace1',
        producerId: 'user1',
        processingStatus: 'processing',
        memberships: []
      }

      vi.mocked(require('next-auth').getServerSession).mockResolvedValue(mockSession)
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace)

      const request = new NextRequest('http://localhost:3000/api/downloads', {
        method: 'POST',
        body: JSON.stringify({
          bookmarkIds: ['bookmark1'],
          workspaceId: 'workspace1',
          bulkDownload: false
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Workspace processing must be completed before downloading clips')
    })

    it('should reject download for non-members', async () => {
      const mockSession = { user: { id: 'user2' } }
      const mockWorkspace = {
        id: 'workspace1',
        producerId: 'user1',
        processingStatus: 'completed',
        memberships: []
      }

      vi.mocked(require('next-auth').getServerSession).mockResolvedValue(mockSession)
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace)

      const request = new NextRequest('http://localhost:3000/api/downloads', {
        method: 'POST',
        body: JSON.stringify({
          bookmarkIds: ['bookmark1'],
          workspaceId: 'workspace1',
          bulkDownload: false
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied')
    })

    it('should validate bookmark ownership', async () => {
      const mockSession = { user: { id: 'user1' } }
      const mockWorkspace = {
        id: 'workspace1',
        producerId: 'user1',
        processingStatus: 'completed',
        memberships: []
      }
      const mockBookmarks = [] // No bookmarks found

      vi.mocked(require('next-auth').getServerSession).mockResolvedValue(mockSession)
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace)
      prisma.bookmark.findMany.mockResolvedValue(mockBookmarks)

      const request = new NextRequest('http://localhost:3000/api/downloads', {
        method: 'POST',
        body: JSON.stringify({
          bookmarkIds: ['bookmark1'],
          workspaceId: 'workspace1',
          bulkDownload: false
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Some bookmarks not found or don\'t belong to this workspace')
    })
  })

  describe('GET', () => {
    it('should return download job status for workspace member', async () => {
      const mockSession = { user: { id: 'user1' } }
      const mockJob = {
        id: 'job1',
        type: 'download_clip',
        status: 'completed',
        progressPercent: 100,
        errorText: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        workspace: {
          producerId: 'user1',
          memberships: []
        }
      }

      vi.mocked(require('next-auth').getServerSession).mockResolvedValue(mockSession)
      prisma.processingJob.findUnique.mockResolvedValue(mockJob)

      const request = new NextRequest('http://localhost:3000/api/downloads?jobId=job1', {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.job).toEqual({
        id: 'job1',
        type: 'download_clip',
        status: 'completed',
        progressPercent: 100,
        errorText: null,
        createdAt: mockJob.createdAt,
        updatedAt: mockJob.updatedAt
      })
    })

    it('should return all download jobs for workspace', async () => {
      const mockSession = { user: { id: 'user1' } }
      const mockWorkspace = {
        producerId: 'user1',
        memberships: []
      }
      const mockJobs = [
        {
          id: 'job1',
          type: 'download_clip',
          status: 'completed',
          progressPercent: 100,
          errorText: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      vi.mocked(require('next-auth').getServerSession).mockResolvedValue(mockSession)
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace)
      prisma.processingJob.findMany.mockResolvedValue(mockJobs)

      const request = new NextRequest('http://localhost:3000/api/downloads?workspaceId=workspace1', {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.jobs).toHaveLength(1)
      expect(data.jobs[0]).toEqual({
        id: 'job1',
        type: 'download_clip',
        status: 'completed',
        progressPercent: 100,
        errorText: null,
        createdAt: mockJobs[0].createdAt,
        updatedAt: mockJobs[0].updatedAt
      })
    })

    it('should return 400 if neither jobId nor workspaceId provided', async () => {
      const mockSession = { user: { id: 'user1' } }

      vi.mocked(require('next-auth').getServerSession).mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/downloads', {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Workspace ID or Job ID required')
    })
  })
})
