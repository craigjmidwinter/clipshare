import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { promises as fs } from "fs"
import path from "path"
import { getProcessedFilesDir } from "@/lib/data-dirs"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: workspaceId, videoId } = params

    // Verify access to workspace and video
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

    // Check if user has access to this video
    const hasWorkspaceAccess = video.workspace.producerId === session.user.id ||
      video.workspace.memberships.some(m => m.userId === session.user.id)

    if (!hasWorkspaceAccess) {
      return NextResponse.json({ error: "Access denied to workspace" }, { status: 403 })
    }

    const hasVideoAccess = video.isPublicToWorkspace || video.addedById === session.user.id
    if (!hasVideoAccess) {
      return NextResponse.json({ error: "Access denied to video" }, { status: 403 })
    }

    // Try to serve thumbnail
    const workspaceDir = path.join(getProcessedFilesDir(), workspaceId, 'videos')
    const thumbnailPath = path.join(workspaceDir, `${videoId}_thumbnail.jpg`)
    
    try {
      const thumbnailBuffer = await fs.readFile(thumbnailPath)
      
      return new NextResponse(thumbnailBuffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      })
    } catch (error) {
      // Return a placeholder or default thumbnail
      return NextResponse.json({ 
        error: 'Thumbnail not available' 
      }, { status: 404 })
    }
  } catch (error) {
    console.error('Thumbnail serving error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
