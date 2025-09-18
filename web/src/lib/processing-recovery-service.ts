import { prisma } from '@/lib/prisma'

export interface RecoveryStats {
  stuckWorkspaces: number
  stuckJobs: number
  stuckVideos: number
  recoveredWorkspaces: number
  recoveredJobs: number
  recoveredVideos: number
}

export class ProcessingRecoveryService {
  private static instance: ProcessingRecoveryService

  static getInstance(): ProcessingRecoveryService {
    if (!ProcessingRecoveryService.instance) {
      ProcessingRecoveryService.instance = new ProcessingRecoveryService()
    }
    return ProcessingRecoveryService.instance
  }

  /**
   * Recover stuck processing jobs by marking them as failed
   * This should be called on application startup
   */
  async recoverStuckProcessingJobs(): Promise<RecoveryStats> {
    console.log('=== PROCESSING RECOVERY SERVICE START ===')
    
    try {
      // Find all workspaces stuck in processing status
      const stuckWorkspaces = await prisma.workspace.findMany({
        where: {
          processingStatus: 'processing'
        },
        select: {
          id: true,
          title: true,
          contentTitle: true,
          updatedAt: true,
          producerId: true
        }
      })

      console.log(`Found ${stuckWorkspaces.length} stuck processing workspaces:`)
      stuckWorkspaces.forEach(workspace => {
        console.log(`- Workspace: ${workspace.title} (${workspace.contentTitle})`)
        console.log(`  ID: ${workspace.id}`)
        console.log(`  Producer: ${workspace.producerId}`)
        console.log(`  Last updated: ${workspace.updatedAt}`)
      })

      // Find all processing jobs stuck in processing status
      const stuckJobs = await prisma.processingJob.findMany({
        where: {
          status: 'processing'
        },
        select: {
          id: true,
          type: true,
          workspaceId: true,
          createdAt: true,
          updatedAt: true
        }
      })

      console.log(`Found ${stuckJobs.length} stuck processing jobs:`)
      stuckJobs.forEach(job => {
        console.log(`- Job: ${job.type} (ID: ${job.id})`)
        console.log(`  Workspace: ${job.workspaceId}`)
        console.log(`  Created: ${job.createdAt}`)
        console.log(`  Updated: ${job.updatedAt}`)
      })

      // Mark stuck workspaces as failed
      let recoveredWorkspaces = 0
      if (stuckWorkspaces.length > 0) {
        const updateResult = await prisma.workspace.updateMany({
          where: {
            processingStatus: 'processing'
          },
          data: {
            processingStatus: 'failed',
            processingProgress: 0
          }
        })
        recoveredWorkspaces = updateResult.count
        console.log(`Marked ${recoveredWorkspaces} workspaces as failed.`)
      }

      // Mark stuck processing jobs as failed
      let recoveredJobs = 0
      if (stuckJobs.length > 0) {
        const jobUpdateResult = await prisma.processingJob.updateMany({
          where: {
            status: 'processing'
          },
          data: {
            status: 'failed',
            errorText: 'Processing interrupted by application restart'
          }
        })
        recoveredJobs = jobUpdateResult.count
        console.log(`Marked ${recoveredJobs} processing jobs as failed.`)
      }

      // Find all videos stuck in processing status
      const stuckVideos = await prisma.video.findMany({
        where: {
          processingStatus: 'processing'
        },
        select: {
          id: true,
          workspaceId: true,
          updatedAt: true
        }
      })

      console.log(`Found ${stuckVideos.length} stuck processing videos:`)
      stuckVideos.forEach(video => {
        console.log(`- Video: ${video.id} (Workspace: ${video.workspaceId})`)
        console.log(`  Last updated: ${video.updatedAt}`)
      })

      // Mark stuck videos as failed
      let recoveredVideos = 0
      if (stuckVideos.length > 0) {
        const videoUpdateResult = await prisma.video.updateMany({
          where: {
            processingStatus: 'processing'
          },
          data: {
            processingStatus: 'failed',
            processingProgress: 0,
            processingError: 'Processing interrupted by application restart'
          }
        })
        recoveredVideos = (videoUpdateResult as any).count ?? 0
        console.log(`Marked ${recoveredVideos} videos as failed.`)
      }

      const stats: RecoveryStats = {
        stuckWorkspaces: stuckWorkspaces.length,
        stuckJobs: stuckJobs.length,
        stuckVideos: stuckVideos.length,
        recoveredWorkspaces,
        recoveredJobs,
        recoveredVideos
      }

      console.log('=== PROCESSING RECOVERY COMPLETED ===')
      console.log('Recovery stats:', stats)

      return stats

    } catch (error) {
      console.error('Error during processing recovery:', error)
      throw new Error(`Processing recovery failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get current processing status summary
   */
  async getProcessingStatusSummary(): Promise<{
    totalWorkspaces: number
    processingWorkspaces: number
    completedWorkspaces: number
    failedWorkspaces: number
    pendingWorkspaces: number
    totalJobs: number
    processingJobs: number
    completedJobs: number
    failedJobs: number
    pendingJobs: number
  }> {
    const workspaceCounts = await prisma.workspace.groupBy({
      by: ['processingStatus'],
      _count: {
        id: true
      }
    })

    const jobCounts = await prisma.processingJob.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    })

    const workspaceStats = workspaceCounts.reduce((acc, item) => {
      acc[`${item.processingStatus}Workspaces`] = item._count.id
      return acc
    }, {} as Record<string, number>)

    const jobStats = jobCounts.reduce((acc, item) => {
      acc[`${item.status}Jobs`] = item._count.id
      return acc
    }, {} as Record<string, number>)

    return {
      totalWorkspaces: workspaceCounts.reduce((sum, item) => sum + item._count.id, 0),
      totalJobs: jobCounts.reduce((sum, item) => sum + item._count.id, 0),
      processingWorkspaces: workspaceStats.processingWorkspaces || 0,
      completedWorkspaces: workspaceStats.completedWorkspaces || 0,
      failedWorkspaces: workspaceStats.failedWorkspaces || 0,
      pendingWorkspaces: workspaceStats.pendingWorkspaces || 0,
      processingJobs: jobStats.processingJobs || 0,
      completedJobs: jobStats.completedJobs || 0,
      failedJobs: jobStats.failedJobs || 0,
      pendingJobs: jobStats.pendingJobs || 0
    }
  }
}
