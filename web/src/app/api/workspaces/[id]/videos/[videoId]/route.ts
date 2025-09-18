import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { promises as fs } from "fs"
import path from "path"
import { getProcessedFilesDir } from "@/lib/data-dirs"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: workspaceId, videoId } = await params

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

    // Check if user has access to workspace
    const hasAccess = workspace.producerId === session.user.id || 
      workspace.memberships.some(m => m.userId === session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get the video to delete
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        workspace: {
          select: { 
            producerId: true, 
            memberships: { select: { userId: true } } 
          }
        }
      }
    })

    if (!video || video.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // Check if user can delete this video
    // Only the video owner or workspace producer can delete
    const canDelete = video.addedById === session.user.id || workspace.producerId === session.user.id

    if (!canDelete) {
      return NextResponse.json({ error: "You can only delete videos you added or if you're the workspace producer" }, { status: 403 })
    }

    // Delete associated files from filesystem
    try {
      const processedFilesDir = getProcessedFilesDir()
      const videoDir = path.join(processedFilesDir, videoId)
      
      // Check if directory exists and delete it
      try {
        await fs.access(videoDir)
        await fs.rm(videoDir, { recursive: true, force: true })
        console.log(`Deleted video files for video ${videoId}`)
      } catch (error) {
        // Directory doesn't exist or couldn't be deleted - not critical
        console.log(`Video directory ${videoDir} not found or couldn't be deleted:`, error)
      }
    } catch (error) {
      console.error(`Error deleting video files for ${videoId}:`, error)
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database (this will cascade delete bookmarks, shotCuts, etc.)
    await prisma.video.delete({
      where: { id: videoId }
    })

    return NextResponse.json({ 
      success: true, 
      message: "Video deleted successfully" 
    })
  } catch (error) {
    console.error("Error deleting video:", error)
    return NextResponse.json(
      { error: "Failed to delete video" },
      { status: 500 }
    )
  }
}
