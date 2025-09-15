import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Get active Plex configuration
    const config = await prisma.plexConfig.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        clientId: true,
        serverUrl: true,
        serverToken: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    console.log("Plex config check:", { config })

    if (!config) {
      return NextResponse.json({ success: false, message: "No Plex configuration found" })
    }

    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error("Error fetching Plex config:", error)
    return NextResponse.json(
      { error: "Failed to fetch configuration" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { clientId, serverUrl, serverToken } = await request.json()

    console.log("Saving Plex config:", { clientId, serverUrl, serverToken: serverToken ? "***" : "missing" })

    if (!clientId || !serverUrl || !serverToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Save global Plex configuration
    // First, deactivate any existing configs
    await prisma.plexConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    })

    // Create new active config
    const newConfig = await prisma.plexConfig.create({
      data: {
        clientId,
        serverUrl,
        serverToken,
        isActive: true,
      },
    })

    console.log("Plex config saved:", { id: newConfig.id })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving Plex config:", error)
    return NextResponse.json(
      { error: "Failed to save configuration" },
      { status: 500 }
    )
  }
}