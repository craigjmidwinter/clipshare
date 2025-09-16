import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { OBSExportService } from "@/lib/obs-export-service"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspaceId = params.id
    const body = await request.json()
    const {
      exportFormat = 'mp4',
      quality = '1080p',
      hotkeyPattern = 'sequential',
      includeCollaborators = true,
      webInterfaceTheme = 'dark',
      namingConvention = 'workspace-content-label'
    } = body

    // Check if workspace exists and user has access
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { 
        id: true,
        producerId: true,
        title: true,
        contentTitle: true,
        processingStatus: true,
        memberships: {
          select: { userId: true }
        }
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    // Check if user has access
    const hasAccess = workspace.producerId === session.user.id || 
      workspace.memberships.some(m => m.userId === session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Check if workspace processing is completed
    if (workspace.processingStatus !== "completed") {
      return NextResponse.json({ 
        error: "Workspace processing must be completed before exporting OBS package" 
      }, { status: 400 })
    }

    // Create export job
    const job = await prisma.processingJob.create({
      data: {
        workspaceId: workspaceId,
        type: 'obs_export',
        status: 'pending',
        payloadJson: JSON.stringify({
          exportFormat,
          quality,
          hotkeyPattern,
          includeCollaborators,
          webInterfaceTheme,
          namingConvention
        }),
        progressPercent: 0,
      }
    })

    // Start background processing
    const obsExportService = OBSExportService.getInstance()
    obsExportService.generateOBSPackage(job.id, {
      workspaceId,
      exportFormat,
      quality,
      hotkeyPattern,
      includeCollaborators,
      webInterfaceTheme,
      namingConvention
    }).catch(error => {
      console.error('OBS export error:', error)
      prisma.processingJob.update({
        where: { id: job.id },
        data: { 
          status: 'failed', 
          errorText: error instanceof Error ? error.message : 'Unknown error' 
        }
      })
    })

    return NextResponse.json({ 
      jobId: job.id,
      status: 'pending',
      message: 'OBS package generation started'
    })

  } catch (error) {
    console.error('OBS export API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to start OBS export' 
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspaceId = params.id
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 })
    }

    // Check if workspace exists and user has access
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { 
        id: true,
        producerId: true,
        memberships: {
          select: { userId: true }
        }
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    // Check if user has access
    const hasAccess = workspace.producerId === session.user.id || 
      workspace.memberships.some(m => m.userId === session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get job status
    const job = await prisma.processingJob.findFirst({
      where: {
        id: jobId,
        workspaceId: workspaceId,
        type: 'obs_export'
      }
    })

    if (!job) {
      return NextResponse.json({ error: "Export job not found" }, { status: 404 })
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      progressPercent: job.progressPercent,
      errorText: job.errorText,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    })

  } catch (error) {
    console.error('OBS export status error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to get export status' 
    }, { status: 500 })
  }
}
