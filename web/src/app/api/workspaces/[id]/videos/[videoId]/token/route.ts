import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

function generateStreamToken(workspaceId: string, videoId: string): string {
  // Deterministic token (no timestamp) so verification matches on server
  const data = `${workspaceId}:${videoId}`
  return crypto.createHmac('sha256', process.env.NEXTAUTH_SECRET || 'fallback').update(data).digest('hex')
}

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

    // Generate stream token
    const token = generateStreamToken(workspaceId, videoId)

    return NextResponse.json({ token })
  } catch (error) {
    console.error('Token generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
