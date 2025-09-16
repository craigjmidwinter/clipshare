import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import path from "path"
import { promises as fs } from "fs"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; jobId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspaceId = params.id
    const jobId = params.jobId

    // Check if workspace exists and user has access
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { 
        id: true,
        producerId: true,
        title: true,
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

    // Get job details
    const job = await prisma.processingJob.findFirst({
      where: {
        id: jobId,
        workspaceId: workspaceId,
        type: 'obs_export',
        status: 'completed'
      }
    })

    if (!job) {
      return NextResponse.json({ error: "Export job not found or not completed" }, { status: 404 })
    }

    // Parse job payload to get zip path
    const payload = JSON.parse(job.payloadJson)
    const zipPath = payload.zipPath

    if (!zipPath) {
      return NextResponse.json({ error: "Package file not found" }, { status: 404 })
    }

    // Check if file exists
    try {
      await fs.access(zipPath)
    } catch {
      return NextResponse.json({ error: "Package file not found on disk" }, { status: 404 })
    }

    // Get file stats
    const stats = await fs.stat(zipPath)
    const filename = `${workspace.title.replace(/[^a-zA-Z0-9-_]/g, '_')}_obs-package.zip`

    // Set headers for file download
    const headers = new Headers()
    headers.set('Content-Type', 'application/zip')
    headers.set('Content-Disposition', `attachment; filename="${filename}"`)
    headers.set('Content-Length', stats.size.toString())

    // Read and return the file
    const fileBuffer = await fs.readFile(zipPath)
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('OBS package download error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to download OBS package' 
    }, { status: 500 })
  }
}
