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
        contentTitle: true
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    if (workspace.producerId !== session.user.id) {
      return NextResponse.json({ error: "Only the producer can trigger shot cut detection" }, { status: 403 })
    }

    // Check if workspace is ready for cut detection
    if (workspace.processingStatus !== "completed") {
      return NextResponse.json({ error: "Workspace must be fully processed before detecting shot cuts" }, { status: 400 })
    }

    // Create processing job for shot cut detection
    const processingJob = await prisma.processingJob.create({
      data: {
        workspaceId: workspaceId,
        type: "shot_cut_detection",
        status: "pending",
        payloadJson: JSON.stringify({
          workspaceId: workspaceId,
          contentTitle: workspace.contentTitle
        }),
        progressPercent: 0
      }
    })

    // Start background shot cut detection
    const { ShotCutDetectionService } = await import('@/lib/shot-cut-detection-service')
    const detectionService = ShotCutDetectionService.getInstance()
    
    // Process in background (don't await)
    detectionService.detectShotCuts(processingJob.id, {
      workspaceId: workspaceId,
      contentTitle: workspace.contentTitle
    }).catch(error => {
      console.error('Background shot cut detection error:', error)
    })

    return NextResponse.json({ 
      success: true, 
      message: "Shot cut detection started",
      jobId: processingJob.id
    })
  } catch (error) {
    console.error("Error starting shot cut detection:", error)
    return NextResponse.json(
      { error: "Failed to start shot cut detection" },
      { status: 500 }
    )
  }
}
