import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { promises as fs } from "fs"
import path from "path"
import { getProcessedFilesDir } from "@/lib/data-dirs"
import crypto from "crypto"

function generateStreamToken(workspaceId: string, videoId: string): string {
  const data = `${workspaceId}:${videoId}`
  return crypto.createHmac('sha256', process.env.NEXTAUTH_SECRET || 'fallback').update(data).digest('hex')
}

function verifyStreamToken(workspaceId: string, videoId: string, token: string): boolean {
  const expectedToken = generateStreamToken(workspaceId, videoId)
  return crypto.timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expectedToken, 'hex'))
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; videoId: string } }
) {
  try {
    const { id: workspaceId, videoId } = params
    console.log('Video stream request:', { workspaceId, videoId })
    
    // Check for token-based authentication first (for video elements)
    const url = new URL(request.url)
    const token = url.searchParams.get('token')
    
    if (token) {
      console.log('Using token-based authentication')
      if (!verifyStreamToken(workspaceId, videoId, token)) {
        console.log('Invalid token')
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    } else {
      // Fallback to session-based authentication
      console.log('Using session-based authentication')
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        console.log('No session found')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

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
        return NextResponse.json({ error: 'Video not found' }, { status: 404 })
      }

      // Check if user has access to this video
      const hasWorkspaceAccess = video.workspace.producerId === session.user.id ||
        video.workspace.memberships.some(m => m.userId === session.user.id)

      if (!hasWorkspaceAccess) {
        return NextResponse.json({ error: 'Access denied to workspace' }, { status: 403 })
      }

      // Check video-specific access
      const hasVideoAccess = video.isPublicToWorkspace || video.addedById === session.user.id
      if (!hasVideoAccess) {
        return NextResponse.json({ error: 'Access denied to video' }, { status: 403 })
      }
    }

    // Find the processed video file
    const workspaceDir = path.join(getProcessedFilesDir(), workspaceId, 'videos')
    const videoPath = path.join(workspaceDir, `${videoId}_processed.mp4`)
    
    try {
      const stats = await fs.stat(videoPath)
      console.log('Video file found, size:', stats.size)
      
      // Handle range requests for video streaming
      const range = request.headers.get('range')
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1
        const chunksize = (end - start) + 1
        
        const file = await fs.readFile(videoPath, { start, end })
        
        const headers = new Headers()
        headers.set('Content-Range', `bytes ${start}-${end}/${stats.size}`)
        headers.set('Accept-Ranges', 'bytes')
        headers.set('Content-Length', chunksize.toString())
        headers.set('Content-Type', 'video/mp4')
        headers.set('Access-Control-Allow-Origin', '*')
        headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
        headers.set('Access-Control-Allow-Headers', 'Range, Content-Range')
        
        return new NextResponse(file, {
          status: 206,
          headers
        })
      } else {
        // Full file request
        const file = await fs.readFile(videoPath)
        
        const headers = new Headers()
        headers.set('Content-Type', 'video/mp4')
        headers.set('Content-Length', stats.size.toString())
        headers.set('Accept-Ranges', 'bytes')
        headers.set('Cache-Control', 'public, max-age=3600')
        headers.set('Access-Control-Allow-Origin', '*')
        headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
        headers.set('Access-Control-Allow-Headers', 'Range, Content-Range')
        
        return new NextResponse(file, {
          status: 200,
          headers
        })
      }
    } catch (error) {
      console.error('Error serving video file:', error)
      return NextResponse.json({ 
        error: 'Video file not found. The video may still be processing.' 
      }, { status: 404 })
    }
  } catch (error) {
    console.error('Video streaming error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
