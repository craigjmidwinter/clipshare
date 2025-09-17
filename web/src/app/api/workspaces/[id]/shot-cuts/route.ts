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

    // Get shot cuts for the workspace
    const shotCuts = await prisma.shotCut.findMany({
      where: { workspaceId },
      orderBy: { timestampMs: "asc" }
    })

    return NextResponse.json({ 
      success: true,
      shotCuts: shotCuts.map(cut => ({
        id: cut.id,
        timestampMs: cut.timestampMs,
        confidence: cut.confidence,
        detectionMethod: cut.detectionMethod,
        createdAt: cut.createdAt
      }))
    })
  } catch (error) {
    console.error("Error fetching shot cuts:", error)
    return NextResponse.json(
      { error: "Failed to fetch shot cuts" },
      { status: 500 }
    )
  }
}

