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
    const id = searchParams.get("id")

    if (id) {
      // Get specific workspace
      const workspace = await prisma.workspace.findUnique({
        where: { id },
        include: {
          producer: {
            select: {
              id: true,
              name: true,
              plexUsername: true,
              plexAvatarUrl: true,
            }
          },
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  plexUsername: true,
                  plexAvatarUrl: true,
                }
              }
            }
          },
          bookmarks: {
            include: {
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  plexUsername: true,
                }
              }
            },
            orderBy: { createdAt: "desc" }
          }
        }
      })

      if (!workspace) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
      }

      // Check if user has access to this workspace
      const hasAccess = workspace.producerId === session.user.id || 
        workspace.memberships.some(m => m.userId === session.user.id)

      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }

      return NextResponse.json({ success: true, workspace })
    } else {
      // Get user's workspaces
      const workspaces = await prisma.workspace.findMany({
        where: {
          OR: [
            { producerId: session.user.id },
            { 
              memberships: {
                some: { userId: session.user.id }
              }
            }
          ]
        },
        include: {
          producer: {
            select: {
              id: true,
              name: true,
              plexUsername: true,
              plexAvatarUrl: true,
            }
          },
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  plexUsername: true,
                  plexAvatarUrl: true,
                }
              }
            }
          },
          _count: {
            select: {
              bookmarks: true,
              memberships: true
            }
          }
        },
        orderBy: { updatedAt: "desc" }
      })

      return NextResponse.json({ success: true, workspaces })
    }
  } catch (error) {
    console.error("Error fetching workspaces:", error)
    return NextResponse.json(
      { error: "Failed to fetch workspaces" },
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

    const { 
      plexKey, 
      plexServerId, 
      title, 
      description, 
      contentType, 
      contentTitle, 
      contentPoster, 
      contentDuration,
      collaborators = []
    } = await request.json()

    if (!plexKey || !title || !contentType || !contentTitle || !contentDuration) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        producerId: session.user.id,
        plexKey,
        plexServerId: plexServerId || "default",
        title,
        description,
        contentType,
        contentTitle,
        contentPoster,
        contentDuration,
      }
    })

    // Add producer as a member
    await prisma.membership.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        role: "producer"
      }
    })

    // Add collaborators if provided
    if (collaborators.length > 0) {
      // Find users by Plex username
      const collaboratorUsers = await prisma.user.findMany({
        where: {
          plexUsername: {
            in: collaborators
          }
        }
      })

      // Create memberships for collaborators
      await prisma.membership.createMany({
        data: collaboratorUsers.map(user => ({
          workspaceId: workspace.id,
          userId: user.id,
          role: "collaborator"
        }))
      })
    }

    // Return the created workspace with full details
    const createdWorkspace = await prisma.workspace.findUnique({
      where: { id: workspace.id },
      include: {
        producer: {
          select: {
            id: true,
            name: true,
            plexUsername: true,
            plexAvatarUrl: true,
          }
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                plexUsername: true,
                plexAvatarUrl: true,
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ success: true, workspace: createdWorkspace })
  } catch (error) {
    console.error("Error creating workspace:", error)
    return NextResponse.json(
      { error: "Failed to create workspace" },
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

    const { id, title, description, collaborators } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 })
    }

    // Check if user is the producer
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      select: { producerId: true }
    })

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    if (workspace.producerId !== session.user.id) {
      return NextResponse.json({ error: "Only the producer can edit this workspace" }, { status: 403 })
    }

    // Update workspace
    const updatedWorkspace = await prisma.workspace.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
      }
    })

    // Update collaborators if provided
    if (collaborators !== undefined) {
      // Remove existing collaborator memberships
      await prisma.membership.deleteMany({
        where: {
          workspaceId: id,
          role: "collaborator"
        }
      })

      // Add new collaborators
      if (collaborators.length > 0) {
        const collaboratorUsers = await prisma.user.findMany({
          where: {
            plexUsername: {
              in: collaborators
            }
          }
        })

        await prisma.membership.createMany({
          data: collaboratorUsers.map(user => ({
            workspaceId: id,
            userId: user.id,
            role: "collaborator"
          }))
        })
      }
    }

    return NextResponse.json({ success: true, workspace: updatedWorkspace })
  } catch (error) {
    console.error("Error updating workspace:", error)
    return NextResponse.json(
      { error: "Failed to update workspace" },
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
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 })
    }

    // Check if user is the producer
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      select: { producerId: true }
    })

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    if (workspace.producerId !== session.user.id) {
      return NextResponse.json({ error: "Only the producer can delete this workspace" }, { status: 403 })
    }

    // Delete workspace (cascades to memberships and bookmarks)
    await prisma.workspace.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting workspace:", error)
    return NextResponse.json(
      { error: "Failed to delete workspace" },
      { status: 500 }
    )
  }
}
