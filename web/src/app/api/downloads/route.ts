import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getProcessedFilesDir } from "@/lib/data-dirs"
import path from "path"
import { promises as fs } from "fs"
import { spawn } from "child_process"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { bookmarkIds, workspaceId, bulkDownload = false } = await request.json()

    if (!bookmarkIds || !Array.isArray(bookmarkIds) || bookmarkIds.length === 0) {
      return NextResponse.json({ error: "Bookmark IDs required" }, { status: 400 })
    }

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 })
    }

    // Check if workspace exists and user has access
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { 
        id: true,
        producerId: true,
        processingStatus: true,
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

    // Check if workspace processing is completed
    if (workspace.processingStatus !== "completed") {
      return NextResponse.json({ 
        error: "Workspace processing must be completed before downloading clips" 
      }, { status: 400 })
    }

    // Verify all bookmarks exist and belong to the workspace
    const bookmarks = await prisma.bookmark.findMany({
      where: {
        id: { in: bookmarkIds },
        workspaceId: workspaceId
      },
      select: {
        id: true,
        label: true,
        startMs: true,
        endMs: true,
        workspace: {
          select: {
            title: true,
            contentTitle: true
          }
        }
      }
    })

    if (bookmarks.length !== bookmarkIds.length) {
      return NextResponse.json({ 
        error: "Some bookmarks not found or don't belong to this workspace" 
      }, { status: 400 })
    }

    // Create download jobs
    const downloadJobs = await Promise.all(
      bookmarks.map(bookmark => 
        prisma.processingJob.create({
          data: {
            workspaceId: workspaceId,
            type: "download_clip",
            status: "pending",
            payloadJson: JSON.stringify({
              bookmarkId: bookmark.id,
              bookmarkLabel: bookmark.label,
              startMs: bookmark.startMs,
              endMs: bookmark.endMs,
              workspaceTitle: bookmark.workspace.title,
              contentTitle: bookmark.workspace.contentTitle,
              bulkDownload
            }),
            progressPercent: 0
          }
        })
      )
    )

    // If clips are pre-generated, just mark jobs completed and return file paths
    const workspaceDir = path.join(getProcessedFilesDir(), workspaceId)
    const clipsDir = path.join(workspaceDir, 'clips')
    await fs.mkdir(clipsDir, { recursive: true })

    for (const job of downloadJobs) {
      try {
        const payload = JSON.parse(job.payloadJson) as { bookmarkId: string }
        const outPath = path.join(clipsDir, `${payload.bookmarkId}.mp4`)
        await fs.stat(outPath)
        await prisma.processingJob.update({ where: { id: job.id }, data: { status: 'completed', progressPercent: 100, errorText: null } })
      } catch {
        await prisma.processingJob.update({ where: { id: job.id }, data: { status: 'failed', errorText: 'Clip not ready' } })
      }
    }

    return NextResponse.json({ success: true, message: 'Checked clip readiness', jobIds: downloadJobs.map(j => j.id) })
  } catch (error) {
    console.error("Error starting download:", error)
    return NextResponse.json(
      { error: "Failed to start download" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const jobId = searchParams.get("jobId")

    if (jobId) {
      // Get specific download job
      const job = await prisma.processingJob.findUnique({
        where: { id: jobId },
        include: {
          workspace: {
            select: {
              producerId: true,
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

      return NextResponse.json({ 
        success: true,
        job: {
          id: job.id,
          type: job.type,
          status: job.status,
          progressPercent: job.progressPercent,
          errorText: job.errorText,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt
        }
      })
    } else if (workspaceId) {
      // Get all download jobs for workspace
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { 
          producerId: true,
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

      const jobs = await prisma.processingJob.findMany({
        where: { 
          workspaceId: workspaceId,
          type: "download_clip"
        },
        orderBy: { createdAt: "desc" }
      })

      return NextResponse.json({ 
        success: true,
        jobs: jobs.map(job => ({
          id: job.id,
          type: job.type,
          status: job.status,
          progressPercent: job.progressPercent,
          errorText: job.errorText,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt
        }))
      })
    } else {
      return NextResponse.json({ error: "Workspace ID or Job ID required" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error fetching download status:", error)
    return NextResponse.json(
      { error: "Failed to fetch download status" },
      { status: 500 }
    )
  }
}
