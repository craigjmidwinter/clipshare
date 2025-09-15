import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/bookmarks/[id] - Get a specific bookmark
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const bookmark = await prisma.bookmark.findUnique({
      where: { id },
      include: {
        workspace: {
          include: {
            memberships: {
              where: { userId: session.user.id }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            plexUsername: true,
            plexAvatarUrl: true,
          }
        },
        lockedBy: {
          select: {
            id: true,
            name: true,
            plexUsername: true,
            plexAvatarUrl: true,
          }
        }
      }
    })

    if (!bookmark) {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 })
    }

    // Check if user has access to this workspace
    const hasAccess = bookmark.workspace.producerId === session.user.id || 
      bookmark.workspace.memberships.length > 0

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    return NextResponse.json({ success: true, bookmark })
  } catch (error) {
    console.error("Error fetching bookmark:", error)
    return NextResponse.json(
      { error: "Failed to fetch bookmark" },
      { status: 500 }
    )
  }
}

// PUT /api/bookmarks/[id] - Update a bookmark (including lock/unlock)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { label, publicNotes, privateNotes, isLocked } = body

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

    // Check if user has access to this workspace
    const hasAccess = existingBookmark.workspace.producerId === session.user.id || 
      existingBookmark.workspace.memberships.length > 0

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const isCreator = existingBookmark.createdById === session.user.id
    const isProducer = existingBookmark.workspace.producerId === session.user.id
    const isCurrentlyLocked = !!existingBookmark.lockedById

    // Handle lock/unlock operations
    if (isLocked !== undefined) {
      if (!isProducer) {
        return NextResponse.json({ error: "Only producers can lock/unlock bookmarks" }, { status: 403 })
      }

      const updateData: any = {
        updatedAt: new Date()
      }

      if (isLocked && !isCurrentlyLocked) {
        // Lock the bookmark
        updateData.lockedById = session.user.id
        updateData.lockedAt = new Date()
      } else if (!isLocked && isCurrentlyLocked) {
        // Unlock the bookmark
        updateData.lockedById = null
        updateData.lockedAt = null
      }

      const bookmark = await prisma.bookmark.update({
        where: { id },
        data: updateData,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              plexUsername: true,
              plexAvatarUrl: true,
            }
          },
          lockedBy: {
            select: {
              id: true,
              name: true,
              plexUsername: true,
              plexAvatarUrl: true,
            }
          }
        }
      })

      return NextResponse.json({ 
        success: true, 
        bookmark,
        message: isLocked ? "Bookmark locked" : "Bookmark unlocked"
      })
    }

    // Handle regular updates (label, notes)
    // Only creator can edit their own bookmarks, producer can edit any (unless locked)
    if (isCurrentlyLocked && !isProducer) {
      return NextResponse.json({ error: "Bookmark is locked and cannot be edited" }, { status: 403 })
    }

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
        updatedAt: new Date()
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            plexUsername: true,
            plexAvatarUrl: true,
          }
        },
        lockedBy: {
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

// DELETE /api/bookmarks/[id] - Delete a bookmark
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
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

    // Check if user has access to this workspace
    const hasAccess = existingBookmark.workspace.producerId === session.user.id || 
      existingBookmark.workspace.memberships.length > 0

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Check if user can delete this bookmark
    const isCreator = existingBookmark.createdById === session.user.id
    const isProducer = existingBookmark.workspace.producerId === session.user.id
    const isCurrentlyLocked = !!existingBookmark.lockedById

    // If locked, only the producer can delete
    if (isCurrentlyLocked && !isProducer) {
      return NextResponse.json({ error: "Locked bookmarks can only be deleted by the producer" }, { status: 403 })
    }

    // Only creator can delete their own bookmarks, producer can delete any
    if (!isCreator && !isProducer) {
      return NextResponse.json({ error: "Only bookmark creator or producer can delete" }, { status: 403 })
    }

    // Delete the bookmark
    await prisma.bookmark.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: "Bookmark deleted" })
  } catch (error) {
    console.error("Error deleting bookmark:", error)
    return NextResponse.json(
      { error: "Failed to delete bookmark" },
      { status: 500 }
    )
  }
}
