import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 })
    }

    // Check if user has access to this workspace
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        memberships: {
          where: { userId: session.user.id }
        }
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    const hasAccess = workspace.producerId === session.user.id || 
      workspace.memberships.length > 0

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get bookmarks for this workspace
    const bookmarks = await prisma.bookmark.findMany({
      where: { workspaceId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            plexUsername: true,
            plexAvatarUrl: true,
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ success: true, bookmarks })
  } catch (error) {
    console.error("Error fetching bookmarks:", error)
    return NextResponse.json(
      { error: "Failed to fetch bookmarks" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId, label, publicNotes, privateNotes, startMs, endMs } = body

    if (!workspaceId || startMs === undefined || endMs === undefined) {
      return NextResponse.json({ 
        error: "Workspace ID, start time, and end time are required" 
      }, { status: 400 })
    }

    if (startMs >= endMs) {
      return NextResponse.json({ 
        error: "Start time must be less than end time" 
      }, { status: 400 })
    }

    // Check if user has access to this workspace
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        memberships: {
          where: { userId: session.user.id }
        }
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    const hasAccess = workspace.producerId === session.user.id || 
      workspace.memberships.length > 0

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Check if bookmark times are within content duration
    if (startMs < 0 || endMs > workspace.contentDuration) {
      return NextResponse.json({ 
        error: "Bookmark times must be within content duration" 
      }, { status: 400 })
    }

    // Create the bookmark
    const bookmark = await prisma.bookmark.create({
      data: {
        workspaceId,
        createdById: session.user.id,
        label: label || null,
        publicNotes: publicNotes || null,
        privateNotes: privateNotes || null,
        startMs,
        endMs,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            plexUsername: true,
            plexAvatarUrl: true,
          }
        }
      }
    })

    return NextResponse.json({ success: true, bookmark })
  } catch (error) {
    console.error("Error creating bookmark:", error)
    return NextResponse.json(
      { error: "Failed to create bookmark" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id, label, publicNotes, privateNotes } = body

    if (!id) {
      return NextResponse.json({ error: "Bookmark ID is required" }, { status: 400 })
    }

    // Get the bookmark and check permissions
    const existingBookmark = await prisma.bookmark.findUnique({
      where: { id },
      include: {
        workspace: {
          include: {
            memberships: {
              where: { userId: session.user.id }
            }
          }
        }
      }
    })

    if (!existingBookmark) {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 })
    }

    // Check if user can edit this bookmark
    const isCreator = existingBookmark.createdById === session.user.id
    const isProducer = existingBookmark.workspace.producerId === session.user.id
    const hasAccess = existingBookmark.workspace.producerId === session.user.id || 
      existingBookmark.workspace.memberships.length > 0

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Only creator can edit their own bookmarks, producer can edit any
    if (!isCreator && !isProducer) {
      return NextResponse.json({ error: "Only bookmark creator or producer can edit" }, { status: 403 })
    }

    // Update the bookmark
    const bookmark = await prisma.bookmark.update({
      where: { id },
      data: {
        label: label !== undefined ? label : existingBookmark.label,
        publicNotes: publicNotes !== undefined ? publicNotes : existingBookmark.publicNotes,
        privateNotes: privateNotes !== undefined ? privateNotes : existingBookmark.privateNotes,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            plexUsername: true,
            plexAvatarUrl: true,
          }
        }
      }
    })

    return NextResponse.json({ success: true, bookmark })
  } catch (error) {
    console.error("Error updating bookmark:", error)
    return NextResponse.json(
      { error: "Failed to update bookmark" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Bookmark ID is required" }, { status: 400 })
    }

    // Get the bookmark and check permissions
    const existingBookmark = await prisma.bookmark.findUnique({
      where: { id },
      include: {
        workspace: {
          include: {
            memberships: {
              where: { userId: session.user.id }
            }
          }
        }
      }
    })

    if (!existingBookmark) {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 })
    }

    // Check if user can delete this bookmark
    const isCreator = existingBookmark.createdById === session.user.id
    const isProducer = existingBookmark.workspace.producerId === session.user.id
    const hasAccess = existingBookmark.workspace.producerId === session.user.id || 
      existingBookmark.workspace.memberships.length > 0

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Only creator can delete their own bookmarks, producer can delete any
    if (!isCreator && !isProducer) {
      return NextResponse.json({ error: "Only bookmark creator or producer can delete" }, { status: 403 })
    }

    // Delete the bookmark
    await prisma.bookmark.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting bookmark:", error)
    return NextResponse.json(
      { error: "Failed to delete bookmark" },
      { status: 500 }
    )
  }
}
