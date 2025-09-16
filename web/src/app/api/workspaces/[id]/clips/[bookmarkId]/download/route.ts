import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import path from "path"
import { promises as fs } from "fs"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; bookmarkId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspaceId = params.id
    const bookmarkId = params.bookmarkId

    // Check if workspace exists and user has access
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { 
        id: true,
        producerId: true,
        title: true,
        contentTitle: true,
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

    // Get bookmark info
    const bookmark = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
      select: {
        id: true,
        label: true,
        workspaceId: true
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

      // Read file
      const fileBuffer = await fs.readFile(clipPath)
      
      // Generate filename
      const bookmarkLabel = bookmark.label || "bookmark"
      const safeLabel = bookmarkLabel.replace(/[^a-zA-Z0-9-_]/g, '_')
      const filename = `${safeLabel}_${bookmarkId}.mp4`

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
        error: "Clip file not found. The clip may not be ready yet." 
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
