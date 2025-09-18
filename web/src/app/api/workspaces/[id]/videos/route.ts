import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { promises as fs } from "fs"
import path from "path"
import { getProcessedFilesDir } from "@/lib/data-dirs"
import { VideoProcessingService } from "@/lib/video-processing-service"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: workspaceId } = await params

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

    // Get all videos for this workspace
    const videos = await prisma.video.findMany({
      where: { 
        workspaceId,
        // Only show videos that are public to workspace OR added by current user
        OR: [
          { isPublicToWorkspace: true },
          { addedById: session.user.id }
        ]
      },
      include: {
        addedBy: {
          select: {
            id: true,
            name: true,
            plexUsername: true,
            plexAvatarUrl: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({ videos })
  } catch (error) {
    console.error("Error fetching workspace videos:", error)
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: workspaceId } = await params
    const formData = await request.formData()
    
    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const sourceType = formData.get("sourceType") as string
    const sourceUrl = formData.get("sourceUrl") as string
    const isPublicToWorkspace = formData.get("isPublicToWorkspace") === "true"
    const accessControlWarned = formData.get("accessControlWarned") === "true"

    if (!sourceType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // For YouTube videos, title is optional as it will be extracted from the video
    if (sourceType !== 'youtube' && !title) {
      return NextResponse.json({ error: "Title is required for non-YouTube videos" }, { status: 400 })
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

    let videoData: any = {
      workspaceId,
      title: sourceType === 'youtube' ? (title || 'Processing YouTube video...') : title,
      description,
      sourceType,
      addedById: session.user.id,
      isPublicToWorkspace,
      accessControlWarned,
      processingStatus: "pending",
      processingProgress: 0
    }

    // Handle different source types
    if (sourceType === "youtube") {
      if (!sourceUrl) {
        return NextResponse.json({ error: "YouTube URL is required" }, { status: 400 })
      }
      videoData.sourceUrl = sourceUrl
    } else if (sourceType === "upload") {
      const file = formData.get("file") as File
      if (!file) {
        return NextResponse.json({ error: "File is required for upload" }, { status: 400 })
      }

      // Validate file type
      if (!file.type.startsWith('video/')) {
        return NextResponse.json({ error: "File must be a video" }, { status: 400 })
      }

      // Validate file size (max 2GB)
      const maxSize = 2 * 1024 * 1024 * 1024 // 2GB
      if (file.size > maxSize) {
        return NextResponse.json({ error: "File size must be less than 2GB" }, { status: 400 })
      }

      // Create workspace directory if it doesn't exist
      const workspaceDir = path.join(getProcessedFilesDir(), workspaceId, 'videos')
      await fs.mkdir(workspaceDir, { recursive: true })

      // Generate unique filename
      const fileExtension = path.extname(file.name)
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filePath = path.join(workspaceDir, fileName)

      // Save file
      const buffer = Buffer.from(await file.arrayBuffer())
      await fs.writeFile(filePath, buffer)

      videoData.fileName = fileName
      videoData.fileSize = file.size
      videoData.sourceUrl = filePath
    } else if (sourceType === "plex") {
      const plexKey = formData.get("plexKey") as string
      const plexServerId = formData.get("plexServerId") as string
      
      if (!plexKey) {
        return NextResponse.json({ error: "Plex key is required" }, { status: 400 })
      }
      
      videoData.plexKey = plexKey
      videoData.plexServerId = plexServerId || "default"
    }

    // Create video record
    const video = await prisma.video.create({
      data: videoData,
      include: {
        addedBy: {
          select: {
            id: true,
            name: true,
            plexUsername: true,
            plexAvatarUrl: true
          }
        }
      }
    })

    // Start processing job
    const processingJob = await prisma.processingJob.create({
      data: {
        workspaceId,
        type: "video_processing",
        status: "pending",
        payloadJson: JSON.stringify({
          videoId: video.id,
          sourceType: video.sourceType,
          sourceUrl: video.sourceUrl,
          plexKey: video.plexKey,
          plexServerId: video.plexServerId
        }),
        progressPercent: 0
      }
    })

    // Start background processing
    const processingService = VideoProcessingService.getInstance()
    processingService.processVideo(processingJob.id, {
      videoId: video.id,
      workspaceId: video.workspaceId,
      sourceType: video.sourceType,
      sourceUrl: video.sourceUrl,
      plexKey: video.plexKey,
      plexServerId: video.plexServerId
    }).catch(error => {
      console.error('Background video processing error:', error)
    })

    return NextResponse.json({ 
      success: true, 
      video,
      processingStarted: true,
      jobId: processingJob.id
    })
  } catch (error) {
    console.error("Error adding video to workspace:", error)
    return NextResponse.json(
      { error: "Failed to add video" },
      { status: 500 }
    )
  }
}
