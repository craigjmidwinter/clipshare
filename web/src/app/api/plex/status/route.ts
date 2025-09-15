import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Check if there's an active Plex configuration
    const plexConfig = await prisma.plexConfig.findFirst({
      where: { isActive: true }
    })

    return NextResponse.json({ 
      isConfigured: !!plexConfig,
      hasConfig: !!plexConfig
    })
  } catch (error) {
    console.error("Error checking Plex configuration:", error)
    return NextResponse.json(
      { error: "Failed to check Plex configuration" },
      { status: 500 }
    )
  }
}
