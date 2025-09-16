import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import path from "path"
import { promises as fs } from "fs"

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const jobId = params.jobId

    // Get the download job
    const job = await prisma.processingJob.findUnique({
      where: { id: jobId },
      include: {
        workspace: {
          select: {
            producerId: true,
            title: true,
            contentTitle: true,
            memberships: {
              select: { userId: true }
            }
          }
        }
      }
    })

    if (!job) {
      return NextResponse.json({ error: "Download job not found" }, { status: 404 })
    }

    // Check if user has access to the workspace
    const hasAccess = job.workspace.producerId === session.user.id || 
      job.workspace.memberships.some(m => m.userId === session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Check if job is completed
    if (job.status !== "completed") {
      return NextResponse.json({ 
        error: "Download not ready", 
        status: job.status,
        progress: job.progressPercent 
      }, { status: 400 })
    }

    const payload = JSON.parse(job.payloadJson) as { 
      bookmarkId: string
      bookmarkLabel: string | null
      workspaceTitle: string
      contentTitle: string
    }

    // Construct file path
    const clipPath = path.join(
      process.cwd(), 
      'processed-files', 
      job.workspaceId, 
      'clips', 
      `${payload.bookmarkId}.mp4`
    )

    try {
      // Check if file exists
      await fs.access(clipPath)

      // Read file
      const fileBuffer = await fs.readFile(clipPath)
      
      // Generate filename
      const bookmarkLabel = payload.bookmarkLabel || "bookmark"
      const safeLabel = bookmarkLabel.replace(/[^a-zA-Z0-9-_]/g, '_')
      const filename = `${safeLabel}_${payload.bookmarkId}.mp4`

      // Return file with proper headers
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': fileBuffer.length.toString(),
        },
      })
    } catch (fileError) {
      console.error("File not found:", clipPath, fileError)
      return NextResponse.json({ 
        error: "Clip file not found" 
      }, { status: 404 })
    }
  } catch (error) {
    console.error("Error downloading clip:", error)
    return NextResponse.json(
      { error: "Failed to download clip" },
      { status: 500 }
    )
  }
}
