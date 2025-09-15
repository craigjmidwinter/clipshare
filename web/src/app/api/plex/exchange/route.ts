import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { pinId } = await request.json()

    if (!pinId) {
      return NextResponse.json({ error: "PIN ID is required" }, { status: 400 })
    }

    // Get the PIN from our database
    const plexPin = await prisma.plexPin.findUnique({
      where: { id: pinId }
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

    // Get the global Plex configuration
    const plexConfig = await prisma.plexConfig.findFirst({
      where: { isActive: true }
    })

    if (!plexConfig) {
      return NextResponse.json(
        { error: "Plex configuration not found" },
        { status: 400 }
      )
    }

    // Exchange PIN for access token
    const tokenResponse = await axios.get(`https://plex.tv/api/v2/pins/${plexPin.pinId}`, {
      headers: {
        "X-Plex-Client-Identifier": plexConfig.clientId,
        "X-Plex-Product": "ClipShare",
        "X-Plex-Version": "1.0.0",
        "X-Plex-Device": "ClipShare Web",
        "X-Plex-Platform": "Web",
        "X-Plex-Platform-Version": "1.0.0"
      }
    })

    const data = tokenResponse.data as any
    const { authToken } = data

    if (!authToken) {
      return NextResponse.json(
        { error: "PIN not yet authorized by user" },
        { status: 400 }
      )
    }

    // Get user info from Plex
    const userResponse = await axios.get("https://plex.tv/api/v2/user", {
      headers: {
        "X-Plex-Token": authToken
      }
    })

    const plexUserData = userResponse.data as any
    const plexUser = plexUserData.user

    // Create or update user in our database
    const user = await prisma.user.upsert({
      where: { plexUserId: plexUser.id.toString() },
      update: {
        plexUsername: plexUser.username,
        plexEmail: plexUser.email,
        plexAvatarUrl: plexUser.thumb,
        name: plexUser.username,
        email: plexUser.email,
        image: plexUser.thumb,
      },
      create: {
        plexUserId: plexUser.id.toString(),
        plexUsername: plexUser.username,
        plexEmail: plexUser.email,
        plexAvatarUrl: plexUser.thumb,
        name: plexUser.username,
        email: plexUser.email,
        image: plexUser.thumb,
        onboardingCompleted: false,
      },
    })

    // Update the PIN with the user ID and token
    await prisma.plexPin.update({
      where: { id: pinId },
      data: {
        userId: user.id,
        token: authToken,
      }
    })

    // Create a PlexServer entry for the user's main server
    await prisma.plexServer.upsert({
      where: { 
        userId_serverUrl: {
          userId: user.id,
          serverUrl: plexConfig.serverUrl
        }
      },
      update: {
        token: authToken,
        name: plexConfig.serverUrl,
        lastSyncAt: new Date(),
        status: "active",
      },
      create: {
        userId: user.id,
        serverUrl: plexConfig.serverUrl,
        token: authToken,
        name: plexConfig.serverUrl,
        lastSyncAt: new Date(),
        status: "active",
      },
    })

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
      },
      authToken
    })
  } catch (error) {
    console.error("Error exchanging Plex PIN:", error)
    
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number }; code?: string }
      if (axiosError.response?.status === 401) {
        return NextResponse.json(
          { error: "Invalid PIN or PIN not authorized" },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { error: "Failed to exchange PIN for token" },
      { status: 500 }
    )
  }
}
