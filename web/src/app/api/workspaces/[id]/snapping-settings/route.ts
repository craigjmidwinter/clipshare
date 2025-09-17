import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
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

    // Get snapping settings for the workspace (create default if doesn't exist)
    let snappingSettings = await prisma.workspaceSnappingSettings.findUnique({
      where: { workspaceId }
    })

    if (!snappingSettings) {
      snappingSettings = await prisma.workspaceSnappingSettings.create({
        data: {
          workspaceId,
          snappingEnabled: true,
          snapDistanceMs: 2000,
          confidenceThreshold: 0.7
        }
      })
    }

    return NextResponse.json({ 
      success: true,
      snappingSettings: {
        id: snappingSettings.id,
        snappingEnabled: snappingSettings.snappingEnabled,
        snapDistanceMs: snappingSettings.snapDistanceMs,
        confidenceThreshold: snappingSettings.confidenceThreshold,
        createdAt: snappingSettings.createdAt,
        updatedAt: snappingSettings.updatedAt
      }
    })
  } catch (error) {
    console.error("Error fetching snapping settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch snapping settings" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspaceId = params.id

    // Check if workspace exists and user is the producer
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { 
        id: true,
        producerId: true
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    if (workspace.producerId !== session.user.id) {
      return NextResponse.json({ error: "Only the producer can update snapping settings" }, { status: 403 })
    }

    const body = await request.json()
    const { snappingEnabled, snapDistanceMs, confidenceThreshold } = body

    // Validate input
    if (typeof snappingEnabled !== 'boolean') {
      return NextResponse.json({ error: "snappingEnabled must be a boolean" }, { status: 400 })
    }

    if (typeof snapDistanceMs !== 'number' || snapDistanceMs < 500 || snapDistanceMs > 10000) {
      return NextResponse.json({ error: "snapDistanceMs must be a number between 500 and 10000" }, { status: 400 })
    }

    if (typeof confidenceThreshold !== 'number' || confidenceThreshold < 0.3 || confidenceThreshold > 0.95) {
      return NextResponse.json({ error: "confidenceThreshold must be a number between 0.3 and 0.95" }, { status: 400 })
    }

    // Update or create snapping settings
    const snappingSettings = await prisma.workspaceSnappingSettings.upsert({
      where: { workspaceId },
      update: {
        snappingEnabled,
        snapDistanceMs,
        confidenceThreshold,
        updatedAt: new Date()
      },
      create: {
        workspaceId,
        snappingEnabled,
        snapDistanceMs,
        confidenceThreshold
      }
    })

    return NextResponse.json({ 
      success: true,
      message: "Snapping settings updated",
      snappingSettings: {
        id: snappingSettings.id,
        snappingEnabled: snappingSettings.snappingEnabled,
        snapDistanceMs: snappingSettings.snapDistanceMs,
        confidenceThreshold: snappingSettings.confidenceThreshold,
        createdAt: snappingSettings.createdAt,
        updatedAt: snappingSettings.updatedAt
      }
    })
  } catch (error) {
    console.error("Error updating snapping settings:", error)
    return NextResponse.json(
      { error: "Failed to update snapping settings" },
      { status: 500 }
    )
  }
}
