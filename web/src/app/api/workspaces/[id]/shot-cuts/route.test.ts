import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getShotCuts, POST as detectShotCuts } from '@/app/api/workspaces/[id]/shot-cuts/route'
import { GET as getSnappingSettings, PUT as updateSnappingSettings } from '@/app/api/workspaces/[id]/snapping-settings/route'

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    workspace: {
      findUnique: vi.fn(),
    },
    shotCut: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    workspaceSnappingSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    processingJob: {
      create: vi.fn(),
    },
  },
}))

// Mock the shot cut detection service
vi.mock('@/lib/shot-cut-detection-service', () => ({
  ShotCutDetectionService: {
    getInstance: vi.fn(() => ({
      detectShotCuts: vi.fn(),
    })),
  },
}))

describe('Shot Cuts API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/workspaces/[id]/shot-cuts', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/workspaces/test/shot-cuts')
      const response = await getShotCuts(request, { params: { id: 'test' } })

      expect(response.status).toBe(401)
    })

    it('should return 404 if workspace not found', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } })
      mockPrisma.workspace.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/workspaces/test/shot-cuts')
      const response = await getShotCuts(request, { params: { id: 'test' } })

      expect(response.status).toBe(404)
    })

    it('should return 403 if user has no access', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } })
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'workspace-1',
        producerId: 'user-2',
        memberships: [],
      })

      const request = new NextRequest('http://localhost:3000/api/workspaces/test/shot-cuts')
      const response = await getShotCuts(request, { params: { id: 'test' } })

      expect(response.status).toBe(403)
    })

    it('should return shot cuts for authorized user', async () => {
      const mockShotCuts = [
        {
          id: 'cut-1',
          timestampMs: 5000,
          confidence: 0.8,
          detectionMethod: 'histogram',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ]

      mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } })
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'workspace-1',
        producerId: 'user-1',
        memberships: [],
      })
      mockPrisma.shotCut.findMany.mockResolvedValue(mockShotCuts)

      const request = new NextRequest('http://localhost:3000/api/workspaces/test/shot-cuts')
      const response = await getShotCuts(request, { params: { id: 'test' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.shotCuts).toEqual(mockShotCuts)
    })
  })

  describe('POST /api/workspaces/[id]/shot-cuts/detect', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/workspaces/test/shot-cuts/detect', {
        method: 'POST',
      })
      const response = await detectShotCuts(request, { params: { id: 'test' } })

      expect(response.status).toBe(401)
    })

    it('should return 403 if user is not producer', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } })
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'workspace-1',
        producerId: 'user-2',
        processingStatus: 'completed',
      })

      const request = new NextRequest('http://localhost:3000/api/workspaces/test/shot-cuts/detect', {
        method: 'POST',
      })
      const response = await detectShotCuts(request, { params: { id: 'test' } })

      expect(response.status).toBe(403)
    })

    it('should return 400 if workspace not completed', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } })
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'workspace-1',
        producerId: 'user-1',
        processingStatus: 'processing',
      })

      const request = new NextRequest('http://localhost:3000/api/workspaces/test/shot-cuts/detect', {
        method: 'POST',
      })
      const response = await detectShotCuts(request, { params: { id: 'test' } })

      expect(response.status).toBe(400)
    })
  })
})

describe('Snapping Settings API', () => {
  let mockGetServerSession: any
  let mockPrisma: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetServerSession = require('next-auth').getServerSession
    mockPrisma = require('@/lib/prisma').prisma
  })

  describe('GET /api/workspaces/[id]/snapping-settings', () => {
    it('should create default settings if none exist', async () => {
      const mockSettings = {
        id: 'settings-1',
        snappingEnabled: true,
        snapDistanceMs: 2000,
        confidenceThreshold: 0.7,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } })
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'workspace-1',
        producerId: 'user-1',
        memberships: [],
      })
      mockPrisma.workspaceSnappingSettings.findUnique.mockResolvedValue(null)
      mockPrisma.workspaceSnappingSettings.create.mockResolvedValue(mockSettings)

      const request = new NextRequest('http://localhost:3000/api/workspaces/test/snapping-settings')
      const response = await getSnappingSettings(request, { params: { id: 'test' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.snappingSettings).toEqual(mockSettings)
    })
  })

  describe('PUT /api/workspaces/[id]/snapping-settings', () => {
    it('should return 403 if user is not producer', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } })
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'workspace-1',
        producerId: 'user-2',
      })

      const request = new NextRequest('http://localhost:3000/api/workspaces/test/snapping-settings', {
        method: 'PUT',
        body: JSON.stringify({
          snappingEnabled: true,
          snapDistanceMs: 2000,
          confidenceThreshold: 0.7,
        }),
      })
      const response = await updateSnappingSettings(request, { params: { id: 'test' } })

      expect(response.status).toBe(403)
    })

    it('should validate snap distance range', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } })
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'workspace-1',
        producerId: 'user-1',
      })

      const request = new NextRequest('http://localhost:3000/api/workspaces/test/snapping-settings', {
        method: 'PUT',
        body: JSON.stringify({
          snappingEnabled: true,
          snapDistanceMs: 100, // Too small
          confidenceThreshold: 0.7,
        }),
      })
      const response = await updateSnappingSettings(request, { params: { id: 'test' } })

      expect(response.status).toBe(400)
    })

    it('should validate confidence threshold range', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } })
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'workspace-1',
        producerId: 'user-1',
      })

      const request = new NextRequest('http://localhost:3000/api/workspaces/test/snapping-settings', {
        method: 'PUT',
        body: JSON.stringify({
          snappingEnabled: true,
          snapDistanceMs: 2000,
          confidenceThreshold: 0.1, // Too small
        }),
      })
      const response = await updateSnappingSettings(request, { params: { id: 'test' } })

      expect(response.status).toBe(400)
    })
  })
})
