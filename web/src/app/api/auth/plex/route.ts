import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { pinId } = await request.json()

    if (!pinId) {
      return NextResponse.json({ error: "PIN ID is required" }, { status: 400 })
    }

    // Get the PIN from our database
    const plexPin = await prisma.plexPin.findUnique({
      where: { id: pinId },
      include: { user: true }
    })

    if (!plexPin) {
      return NextResponse.json(
        { error: "PIN not found" },
        { status: 404 }
      )
    }

    // Check if PIN has expired
    if (new Date() > plexPin.expiresAt) {
      return NextResponse.json(
        { error: "PIN has expired" },
        { status: 400 }
      )
    }

    // Check if PIN has been exchanged for a token
    if (!plexPin.token || !plexPin.userId) {
      return NextResponse.json(
        { error: "PIN not yet authorized by user" },
        { status: 400 }
      )
    }

    // Create a session for the user
    const user = plexPin.user
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Return user data for session creation
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        plexUserId: user.plexUserId,
        plexUsername: user.plexUsername,
        onboardingCompleted: user.onboardingCompleted,
      }
    })
  } catch (error) {
    console.error("Error authenticating with Plex PIN:", error)
    return NextResponse.json(
      { error: "Failed to authenticate with Plex" },
      { status: 500 }
    )
  }
}
