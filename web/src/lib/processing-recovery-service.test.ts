import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProcessingRecoveryService } from './processing-recovery-service'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    workspace: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      groupBy: vi.fn()
    },
    processingJob: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      groupBy: vi.fn()
    },
    video: {
      findMany: vi.fn(),
      updateMany: vi.fn()
    }
  }
}))

describe('ProcessingRecoveryService', () => {
  let service: ProcessingRecoveryService

  beforeEach(() => {
    service = ProcessingRecoveryService.getInstance()
    vi.clearAllMocks()
  })

  describe('recoverStuckProcessingJobs', () => {
    it('should recover stuck workspaces, jobs, and videos', async () => {
      const mockStuckWorkspaces = [
        {
          id: 'workspace-1',
          title: 'Test Workspace 1',
          contentTitle: 'Episode 1',
          updatedAt: new Date('2024-01-01'),
          producerId: 'user-1'
        },
        {
          id: 'workspace-2',
          title: 'Test Workspace 2',
          contentTitle: 'Episode 2',
          updatedAt: new Date('2024-01-02'),
          producerId: 'user-2'
        }
      ]

      const mockStuckJobs = [
        {
          id: 'job-1',
          type: 'workspace_processing',
          workspaceId: 'workspace-1',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        {
          id: 'job-2',
          type: 'shot_cut_detection',
          workspaceId: 'workspace-2',
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02')
        }
      ]

      const mockStuckVideos = [
        { id: 'video-1', workspaceId: 'workspace-1', processingStatus: 'processing' },
        { id: 'video-2', workspaceId: 'workspace-2', processingStatus: 'processing' }
      ]

      // Mock prisma calls
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.workspace.findMany).mockResolvedValue(mockStuckWorkspaces)
      vi.mocked(prisma.processingJob.findMany).mockResolvedValue(mockStuckJobs)
      vi.mocked(prisma.video.findMany).mockResolvedValue(mockStuckVideos as any)
      vi.mocked(prisma.workspace.updateMany).mockResolvedValue({ count: 2 })
      vi.mocked(prisma.processingJob.updateMany).mockResolvedValue({ count: 2 })
      vi.mocked(prisma.video.updateMany).mockResolvedValue({ count: 2 } as any)

      const stats = await service.recoverStuckProcessingJobs()

      expect(stats).toEqual({
        stuckWorkspaces: 2,
        stuckJobs: 2,
        stuckVideos: 2,
        recoveredWorkspaces: 2,
        recoveredJobs: 2,
        recoveredVideos: 2
      })

      // Verify workspace updates
      expect(prisma.workspace.updateMany).toHaveBeenCalledWith({
        where: { processingStatus: 'processing' },
        data: {
          processingStatus: 'failed',
          processingProgress: 0
        }
      })

      // Verify job updates
      expect(prisma.processingJob.updateMany).toHaveBeenCalledWith({
        where: { status: 'processing' },
        data: {
          status: 'failed',
          errorText: 'Processing interrupted by application restart'
        }
      })

      // Verify video updates
      expect(prisma.video.updateMany).toHaveBeenCalledWith({
        where: { processingStatus: 'processing' },
        data: {
          processingStatus: 'failed',
          processingProgress: 0,
          processingError: 'Processing interrupted by application restart'
        }
      })
    })

    it('should handle no stuck jobs gracefully', async () => {
      // Mock prisma calls
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.workspace.findMany).mockResolvedValue([])
      vi.mocked(prisma.processingJob.findMany).mockResolvedValue([])
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.video.findMany).mockResolvedValue([] as any)

      const stats = await service.recoverStuckProcessingJobs()

      expect(stats).toEqual({
        stuckWorkspaces: 0,
        stuckJobs: 0,
        stuckVideos: 0,
        recoveredWorkspaces: 0,
        recoveredJobs: 0,
        recoveredVideos: 0
      })

      // Verify no updates were called
      expect(prisma.workspace.updateMany).not.toHaveBeenCalled()
      expect(prisma.processingJob.updateMany).not.toHaveBeenCalled()
      expect(prisma.video.updateMany).not.toHaveBeenCalled()
    })
  })

  describe('getProcessingStatusSummary', () => {
    it('should return correct status summary', async () => {
      const mockWorkspaceCounts = [
        { processingStatus: 'processing', _count: { id: 2 } },
        { processingStatus: 'completed', _count: { id: 5 } },
        { processingStatus: 'failed', _count: { id: 1 } },
        { processingStatus: 'pending', _count: { id: 3 } }
      ]

      const mockJobCounts = [
        { status: 'processing', _count: { id: 1 } },
        { status: 'completed', _count: { id: 8 } },
        { status: 'failed', _count: { id: 2 } },
        { status: 'pending', _count: { id: 1 } }
      ]

      // Mock prisma calls
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.workspace.groupBy).mockResolvedValue(mockWorkspaceCounts)
      vi.mocked(prisma.processingJob.groupBy).mockResolvedValue(mockJobCounts)

      const summary = await service.getProcessingStatusSummary()

      expect(summary).toEqual({
        totalWorkspaces: 11,
        totalJobs: 12,
        processingWorkspaces: 2,
        completedWorkspaces: 5,
        failedWorkspaces: 1,
        pendingWorkspaces: 3,
        processingJobs: 1,
        completedJobs: 8,
        failedJobs: 2,
        pendingJobs: 1
      })
    })
  })
})
