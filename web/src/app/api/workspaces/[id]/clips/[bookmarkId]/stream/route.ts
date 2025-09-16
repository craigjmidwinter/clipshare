import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import path from "path"
import { promises as fs } from "fs"
import crypto from "crypto"

// Generate a secure token for workspace access
function generateStreamToken(workspaceId: string, bookmarkId: string): string {
  const secret = process.env.STREAM_SECRET || 'default-secret-change-in-production'
  const data = `${workspaceId}:${bookmarkId}`
  return crypto.createHmac('sha256', secret).update(data).digest('hex')
}

// Verify a stream token
function verifyStreamToken(workspaceId: string, bookmarkId: string, token: string): boolean {
  const expectedToken = generateStreamToken(workspaceId, bookmarkId)
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; bookmarkId: string } }
) {
  try {
    const workspaceId = params.id
    const bookmarkId = params.bookmarkId
    
    // Get token from query parameter
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    
    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 401 })
    }
    
    // Verify token
    if (!verifyStreamToken(workspaceId, bookmarkId, token)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 })
    }

    // Get bookmark info to verify it exists
    const bookmark = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
      select: {
        id: true,
        workspaceId: true,
        startMs: true,
        endMs: true
      }
    })

    if (!bookmark || bookmark.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 })
    }

    // Construct file path
    const clipPath = path.join(
      process.cwd(), 
      'processed-files', 
      workspaceId, 
      'clips', 
      `${bookmarkId}.mp4`
    )

    try {
      // Check if file exists
      await fs.access(clipPath)
      
      // Get file stats
      const stats = await fs.stat(clipPath)
      
      // Set headers for streaming
      const headers = new Headers()
      headers.set('Content-Type', 'video/mp4')
      headers.set('Content-Length', stats.size.toString())
      headers.set('Accept-Ranges', 'bytes')
      headers.set('Cache-Control', 'public, max-age=3600')
      headers.set('Access-Control-Allow-Origin', '*')
      headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
      headers.set('Access-Control-Allow-Headers', 'Range')
      
      // Handle range requests for video streaming
      const range = request.headers.get('range')
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1
        const chunksize = (end - start) + 1
        
        headers.set('Content-Range', `bytes ${start}-${end}/${stats.size}`)
        headers.set('Content-Length', chunksize.toString())
        
        // Read file chunk
        const fileBuffer = await fs.readFile(clipPath)
        const chunk = fileBuffer.slice(start, end + 1)
        
        return new NextResponse(chunk, {
          status: 206,
          headers
        })
      } else {
        // Return full file
        const fileBuffer = await fs.readFile(clipPath)
        
        return new NextResponse(fileBuffer, {
          status: 200,
          headers
        })
      }
      
    } catch (fileError) {
      // File doesn't exist, try to generate it
      console.log(`Clip file not found, attempting to generate: ${clipPath}`)
      
      // Import the clip generation function
      const { scheduleClipGeneration } = await import('@/lib/clip-jobs')
      
      // Generate the clip
      await scheduleClipGeneration({
        id: bookmarkId,
        workspaceId: workspaceId,
        startMs: bookmark.startMs || 0,
        endMs: bookmark.endMs || 1000
      })
      
      // Return a 202 Accepted with retry info
      return NextResponse.json({ 
        error: "Clip not ready", 
        message: "Clip is being generated, please try again in a few seconds",
        retryAfter: 5
      }, { status: 202 })
    }

  } catch (error) {
    console.error('Clip stream error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to stream clip' 
    }, { status: 500 })
  }
}