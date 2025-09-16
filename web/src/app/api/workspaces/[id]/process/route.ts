import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    // Check if workspace exists and user is the producer
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { 
        id: true,
        producerId: true,
        processingStatus: true,
        plexKey: true,
        plexServerId: true,
        contentTitle: true
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    if (workspace.producerId !== session.user.id) {
      return NextResponse.json({ error: "Only the producer can process this workspace" }, { status: 403 })
    }

    // Check if already processing
    if (workspace.processingStatus === "processing") {
      return NextResponse.json({ error: "Workspace is already being processed" }, { status: 400 })
    }

    // Create processing job
    const processingJob = await prisma.processingJob.create({
      data: {
        workspaceId: workspaceId,
        type: "workspace_processing",
        status: "pending",
        payloadJson: JSON.stringify({
          plexKey: workspace.plexKey,
          plexServerId: workspace.plexServerId,
          contentTitle: workspace.contentTitle
        }),
        progressPercent: 0
      }
    })

    // Update workspace status
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        processingStatus: "processing",
        processingProgress: 0
      }
    })

    // Start real background processing
    const { WorkspaceProcessingService } = await import('@/lib/processing-service')
    const processingService = WorkspaceProcessingService.getInstance()
    
    // Allow optional step selection
    const body = await request.json().catch(() => ({})) as any
    const steps = {
      download: body?.download !== false,
      convert: body?.convert !== false,
      frames: body?.frames !== false,
    }

    // Process in background (don't await)
    processingService.processWorkspace(processingJob.id, {
      workspaceId: workspaceId,
      plexKey: workspace.plexKey,
      plexServerId: workspace.plexServerId,
      contentTitle: workspace.contentTitle,
      steps
    }).catch(error => {
      console.error('Background processing error:', error)
    })

    return NextResponse.json({ 
      success: true, 
      message: "Processing started",
      jobId: processingJob.id
    })
  } catch (error) {
    console.error("Error starting workspace processing:", error)
    return NextResponse.json(
      { error: "Failed to start processing" },
      { status: 500 }
    )
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

    // Check if workspace exists and user has access
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { 
        id: true,
        producerId: true,
        processingStatus: true,
        processingProgress: true,
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

    // Get latest processing job
    const latestJob = await prisma.processingJob.findFirst({
      where: { 
        workspaceId: workspaceId,
        type: "workspace_processing"
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ 
      success: true,
      processingStatus: workspace.processingStatus,
      processingProgress: workspace.processingProgress,
      latestJob: latestJob ? {
        id: latestJob.id,
        status: latestJob.status,
        progressPercent: latestJob.progressPercent,
        errorText: latestJob.errorText,
        createdAt: latestJob.createdAt,
        updatedAt: latestJob.updatedAt
      } : null
    })
  } catch (error) {
    console.error("Error fetching processing status:", error)
    return NextResponse.json(
      { error: "Failed to fetch processing status" },
      { status: 500 }
    )
  }
}
