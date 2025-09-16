import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

// Generate a secure token for workspace access
function generateStreamToken(workspaceId: string, bookmarkId: string): string {
  const secret = process.env.STREAM_SECRET || 'default-secret-change-in-production'
  const data = `${workspaceId}:${bookmarkId}`
  return crypto.createHmac('sha256', secret).update(data).digest('hex')
}

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
        workspaceId: true
      }
    })

    if (!bookmark || bookmark.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 })
    }

    // Generate token
    const token = generateStreamToken(workspaceId, bookmarkId)

    return NextResponse.json({ 
      success: true, 
      token,
      expiresIn: 3600 // 1 hour
    })

  } catch (error) {
    console.error('Token generation error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate token' 
    }, { status: 500 })
  }
}
