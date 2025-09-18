import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getProcessedFilesDir } from "@/lib/data-dirs"
import crypto from "crypto"

// Generate a secure token for workspace access (same as token endpoint)
function generateStreamToken(workspaceId: string, bookmarkId: string): string {
  const secret = process.env.STREAM_SECRET || 'default-secret-change-in-production'
  const data = `${workspaceId}:${bookmarkId}`
  return crypto.createHmac('sha256', secret).update(data).digest('hex')
}

// Verify token
function verifyStreamToken(workspaceId: string, bookmarkId: string, token: string): boolean {
  const expectedToken = generateStreamToken(workspaceId, bookmarkId)
  return crypto.timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expectedToken, 'hex'))
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bookmarkId: string }> }
) {
  try {
    const { id: workspaceId, bookmarkId } = await params
    console.log('Clip stream request:', { workspaceId, bookmarkId })
    
    // Check for token-based authentication first (for video elements)
    const url = new URL(request.url)
    const token = url.searchParams.get('token')
    
    if (token) {
      console.log('Using token-based authentication')
      if (!verifyStreamToken(workspaceId, bookmarkId, token)) {
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

      // Verify access to workspace via bookmark
      const bookmark = await prisma.bookmark.findUnique({
        where: { id: bookmarkId },
        include: {
          workspace: {
            select: { producerId: true, memberships: { select: { userId: true } } }
          }
        }
      })
      if (!bookmark || bookmark.workspaceId !== workspaceId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      const hasAccess = bookmark.workspace.producerId === session.user.id ||
        bookmark.workspace.memberships.some(m => m.userId === session.user.id)
      if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // First check if the clip job is completed
    const job = await prisma.processingJob.findFirst({
      where: {
        type: 'export_clip',
        payloadJson: { contains: `"bookmarkId":"${bookmarkId}"` }
      },
      orderBy: { updatedAt: 'desc' }
    })

    // If no job exists or job is not completed, return error
    if (!job || job.status !== 'completed') {
      console.log('Clip not ready:', { jobStatus: job?.status || 'no job' })
      return NextResponse.json({ error: 'Clip not ready' }, { status: 404 })
    }

    const clipPath = path.join(getProcessedFilesDir(), workspaceId, 'clips', `${bookmarkId}.mp4`)
    console.log('Looking for clip at:', clipPath)
    
    try {
      const stats = await fs.stat(clipPath)
      console.log('Clip file found, size:', stats.size)
      
      // Handle range requests for video streaming
      const range = request.headers.get('range')
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1
        const chunksize = (end - start) + 1
        
        const file = await fs.readFile(clipPath, { start, end })
        
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
        const file = await fs.readFile(clipPath)
        
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
      console.error('Error serving clip file:', error)
      console.log('Clip file not found at:', clipPath)
      return NextResponse.json({ error: 'Clip file not found' }, { status: 404 })
    }
  } catch (e) {
    console.error('clip stream error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bookmarkId: string }> }
) {
  await params // Await params even though we don't use them
  const headers = new Headers()
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Range, Content-Range')
  
  return new NextResponse(null, {
    status: 200,
    headers
  })
}