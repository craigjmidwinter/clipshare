import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// HEAD-like availability check
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; bookmarkId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify access to workspace via bookmark
    const bookmark = await prisma.bookmark.findUnique({
      where: { id: params.bookmarkId },
      include: {
        workspace: {
          select: { producerId: true, memberships: { select: { userId: true } } }
        }
      }
    })
    if (!bookmark || bookmark.workspaceId !== params.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const hasAccess = bookmark.workspace.producerId === session.user.id ||
      bookmark.workspace.memberships.some(m => m.userId === session.user.id)
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const clipPath = path.join(process.cwd(), 'processed-files', params.id, 'clips', `${params.bookmarkId}.mp4`)
    try {
      await fs.stat(clipPath)
      return NextResponse.json({ ready: true, status: 'completed', progressPercent: 100 })
    } catch {
      // Lookup latest job for this bookmark for progress
      const job = await prisma.processingJob.findFirst({
        where: {
          type: 'export_clip',
          payloadJson: { contains: `"bookmarkId":"${params.bookmarkId}"` }
        },
        orderBy: { updatedAt: 'desc' }
      })
      return NextResponse.json({ ready: false, status: job?.status || 'pending', progressPercent: job?.progressPercent ?? 0 }, { status: 404 })
    }
  } catch (e) {
    console.error('clip head error', e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}


