import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ShotCutDetectionService } from '@/lib/shot-cut-detection-service'

// Mock the prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    workspace: {
      findUnique: vi.fn(),
    },
    shotCut: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    processingJob: {
      update: vi.fn(),
    },
  },
}))

// Mock ffmpeg-static
vi.mock('ffmpeg-static', () => ({
  default: '/usr/bin/ffmpeg',
}))

// Mock fs promises
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    mkdir: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
    rm: vi.fn(),
  },
}))

// Mock spawn
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}))

describe('ShotCutDetectionService', () => {
  let service: ShotCutDetectionService
  let mockPrisma: any

  beforeEach(() => {
    vi.clearAllMocks()
    service = ShotCutDetectionService.getInstance()
    mockPrisma = require('@/lib/prisma').prisma
  })

  describe('detectShotCuts', () => {
    it('should throw error if workspace not found', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue(null)

      await expect(
        service.detectShotCuts('job-1', {
          workspaceId: 'workspace-1',
          contentTitle: 'Test Video',
        })
      ).rejects.toThrow('Workspace not found')
    })

    it('should throw error if workspace not completed', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'workspace-1',
        contentDuration: 120000,
        processingStatus: 'processing',
      })

      await expect(
        service.detectShotCuts('job-1', {
          workspaceId: 'workspace-1',
          contentTitle: 'Test Video',
        })
      ).rejects.toThrow('Workspace must be fully processed before detecting shot cuts')
    })

    it('should clear existing shot cuts before detection', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'workspace-1',
        contentDuration: 120000,
        processingStatus: 'completed',
      })

      // Mock file access
      const fs = require('fs')
      fs.promises.access.mockResolvedValue(undefined)

      // Mock ffmpeg process
      const { spawn } = require('child_process')
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10)
          }
        }),
      }
      spawn.mockReturnValue(mockProcess)

      await service.detectShotCuts('job-1', {
        workspaceId: 'workspace-1',
        contentTitle: 'Test Video',
      })

      expect(mockPrisma.shotCut.deleteMany).toHaveBeenCalledWith({
        where: { workspaceId: 'workspace-1' },
      })
    })
  })

  describe('findNearestShotCut', () => {
    it('should return null when snapping is disabled', () => {
      const result = service.findNearestShotCut(5000)
      expect(result).toBeNull()
    })

    it('should return null when no shot cuts available', () => {
      const result = service.findNearestShotCut(5000)
      expect(result).toBeNull()
    })
  })
})
