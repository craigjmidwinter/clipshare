import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import path from "path"
import { promises as fs } from "fs"
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

    const { searchParams } = new URL(request.url)
    const secondParam = searchParams.get("second")
    if (!secondParam) {
      return NextResponse.json({ error: "second query param required" }, { status: 400 })
    }

    const second = Math.max(0, parseInt(secondParam, 10) || 0)
    const { id: workspaceId, videoId } = params

    // Verify access to video and workspace
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        workspace: {
          select: { producerId: true, memberships: { select: { userId: true } } }
        }
      }
    })

    if (!video || video.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    const hasWorkspaceAccess = video.workspace.producerId === session.user.id ||
      video.workspace.memberships.some(m => m.userId === session.user.id)

    if (!hasWorkspaceAccess) {
      return NextResponse.json({ error: "Access denied to workspace" }, { status: 403 })
    }

    const hasVideoAccess = video.isPublicToWorkspace || video.addedById === session.user.id
    if (!hasVideoAccess) {
      return NextResponse.json({ error: "Access denied to video" }, { status: 403 })
    }

    // Frames are generated into processed-files/{workspaceId}/videos/{videoId}/frames
    const framesDir = path.join(getProcessedFilesDir(), workspaceId, 'videos', videoId, 'frames')

    // Our generator wrote: fps=1/10 and filenames like frame_%06d.jpg
    // Approximate mapping: index = floor(second / 10) + 1
    const baseIndex = Math.floor(second / 10) + 1

    // Try nearby frames to fill gaps
    const candidates: string[] = []
    for (let delta = 0; delta <= 3; delta++) {
      const i1 = baseIndex + delta
      const i2 = baseIndex - delta
      if (delta === 0) {
        candidates.push(`frame_${String(i1).padStart(6, '0')}.jpg`)
      } else {
        if (i1 > 0) candidates.push(`frame_${String(i1).padStart(6, '0')}.jpg`)
        if (i2 > 0) candidates.push(`frame_${String(i2).padStart(6, '0')}.jpg`)
      }
    }

    for (const name of candidates) {
      const fp = path.join(framesDir, name)
      try {
        const file = await fs.readFile(fp)
        return new NextResponse(file, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000, immutable'
          }
        })
      } catch {}
    }

    return NextResponse.json({ error: 'frame not found' }, { status: 404 })
  } catch (error) {
    console.error('video frames route error', error)
    return NextResponse.json({ error: 'failed to load frame' }, { status: 500 })
  }
}


