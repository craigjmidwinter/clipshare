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

    console.log(`Found PIN in database:`, {
      id: plexPin.id,
      pinId: plexPin.pinId,
      pinCode: plexPin.pinCode,
      expiresAt: plexPin.expiresAt,
      userId: plexPin.userId
    })

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
    console.log(`Attempting to exchange PIN with Plex API: ${plexPin.pinId}`)
    console.log(`Request URL: https://plex.tv/api/v2/pins/${plexPin.pinId}`)
    console.log(`Headers:`, {
      "X-Plex-Client-Identifier": plexConfig.clientId,
      "X-Plex-Product": "ClipShare",
      "X-Plex-Version": "1.0.0",
      "X-Plex-Device": "ClipShare Web",
      "X-Plex-Platform": "Web",
      "X-Plex-Platform-Version": "1.0.0"
    })
    
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

    console.log(`Plex API Response Status: ${tokenResponse.status}`)
    console.log(`Plex API Response Data:`, tokenResponse.data)
    const data = tokenResponse.data as any
    const { authToken } = data

    console.log(`Extracted authToken: ${authToken}`)
    console.log(`authToken type: ${typeof authToken}`)
    console.log(`authToken truthy: ${!!authToken}`)

    if (!authToken) {
      console.log(`No authToken found, returning error`)
      return NextResponse.json(
        { error: "PIN not yet authorized by user" },
        { status: 400 }
      )
    }

    console.log(`authToken found, proceeding to user API call`)

    // Get user info from Plex
    console.log(`Getting user info from Plex with token: ${authToken}`)
    const userResponse = await axios.get("https://plex.tv/api/v2/user", {
      headers: {
        "X-Plex-Token": authToken
      }
    })

    console.log(`Plex User API Response Status: ${userResponse.status}`)
    console.log(`Plex User API Response Data:`, userResponse.data)

    const plexUserData = userResponse.data as any
    const plexUser = plexUserData // The user data is directly in the response, not nested under 'user'

    console.log(`Plex user data:`, plexUser)
    console.log(`Plex user ID: ${plexUser?.id}`)
    console.log(`Plex user username: ${plexUser?.username}`)
    console.log(`Plex user email: ${plexUser?.email}`)

    if (!plexUser || !plexUser.id) {
      console.log(`Missing plexUser or plexUser.id`)
      return NextResponse.json(
        { error: "Failed to get user information from Plex" },
        { status: 400 }
      )
    }

    console.log(`Creating/updating user in database...`)

    // Create or update user in our database
    console.log(`Attempting user upsert with plexUserId: ${plexUser.id.toString()}`)
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

    console.log(`User upsert successful:`, { id: user.id, name: user.name, email: user.email })

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
      } else if (axiosError.response?.status === 404) {
        return NextResponse.json(
          { error: "PIN not found on Plex servers. It may have expired or been used already." },
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
