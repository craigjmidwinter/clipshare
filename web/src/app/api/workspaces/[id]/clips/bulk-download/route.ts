import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getProcessedFilesDir, getTempDir } from "@/lib/data-dirs"
import path from "path"
import { promises as fs } from "fs"
import { spawn } from "child_process"
import { randomUUID } from "crypto"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspaceId = params.id

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

    // Get all bookmarks for the workspace
    const bookmarks = await prisma.bookmark.findMany({
      where: { workspaceId: workspaceId },
      select: {
        id: true,
        label: true
      }
    })

    if (bookmarks.length === 0) {
      return NextResponse.json({ error: "No bookmarks found" }, { status: 400 })
    }

    // Create temp directory for ZIP
    const tempDir = path.join(getTempDir(), randomUUID())
    await fs.mkdir(tempDir, { recursive: true })

    try {
      // Copy all clip files to temp directory with clean names
      const clipsDir = path.join(getProcessedFilesDir(), workspaceId, 'clips')
      const copiedFiles: string[] = []

      for (const bookmark of bookmarks) {
        const sourcePath = path.join(clipsDir, `${bookmark.id}.mp4`)
        try {
          await fs.access(sourcePath)
          
          const bookmarkLabel = bookmark.label || "bookmark"
          const safeLabel = bookmark.label ? bookmark.label.replace(/[^a-zA-Z0-9-_]/g, '_') : `bookmark_${bookmark.id}`
          const filename = `${safeLabel}.mp4`
          const destPath = path.join(tempDir, filename)
          
          await fs.copyFile(sourcePath, destPath)
          copiedFiles.push(filename)
        } catch (error) {
          console.warn(`Clip file not found for bookmark ${bookmark.id}:`, error)
        }
      }

      if (copiedFiles.length === 0) {
        return NextResponse.json({ error: "No clip files found" }, { status: 404 })
      }

      // Create ZIP file
      const zipPath = path.join(tempDir, 'clips.zip')
      
      // Use Promise to handle zip command
      await new Promise<void>((resolve, reject) => {
        const zip = spawn('zip', ['-r', zipPath, '.'], { cwd: tempDir })
        
        let stderr = ''
        zip.stderr?.on('data', (data) => {
          stderr += data.toString()
        })
        
        zip.on('close', (code) => {
          if (code === 0) {
            resolve()
          } else {
            console.error('ZIP creation failed:', stderr)
            reject(new Error(`ZIP creation failed with code ${code}: ${stderr}`))
          }
        })
        
        zip.on('error', (err) => {
          console.error('ZIP spawn error:', err)
          reject(err)
        })
      })

      // Read ZIP file
      const zipBuffer = await fs.readFile(zipPath)
      
      // Generate filename
      const safeTitle = workspace.title.replace(/[^a-zA-Z0-9-_]/g, '_')
      const filename = `${safeTitle}_clips.zip`

      // Return ZIP file
      return new NextResponse(zipBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': zipBuffer.length.toString(),
        },
      })
    } finally {
      // Clean up temp directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true })
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp directory:', cleanupError)
      }
    }
  } catch (error) {
    console.error("Error creating bulk download:", error)
    return NextResponse.json(
      { error: "Failed to create bulk download" },
      { status: 500 }
    )
  }
}
