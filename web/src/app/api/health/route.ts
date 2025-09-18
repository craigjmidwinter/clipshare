import { NextRequest, NextResponse } from 'next/server'
import { getProcessHealthStatus } from '@/lib/process-monitor'
import { ProcessingRecoveryService } from '@/lib/processing-recovery-service'

let hasRunRecovery = false

export async function GET(request: NextRequest) {
  try {
    if (!hasRunRecovery) {
      hasRunRecovery = true
      try {
        const recoveryService = ProcessingRecoveryService.getInstance()
        await recoveryService.recoverStuckProcessingJobs()
      } catch (err) {
        console.error('Startup processing recovery failed:', err)
      }
    }
    const healthStatus = getProcessHealthStatus()
    
    return NextResponse.json({
      status: healthStatus.healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      processes: healthStatus,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
