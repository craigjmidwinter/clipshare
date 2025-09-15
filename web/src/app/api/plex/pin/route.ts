import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { prisma } from "@/lib/prisma"

export async function POST() {
  try {
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

    // Generate a PIN from Plex API
    const pinResponse = await axios.post("https://plex.tv/api/v2/pins", {
      strong: true
    }, {
      headers: {
        "X-Plex-Client-Identifier": plexConfig.clientId,
        "X-Plex-Product": "ClipShare",
        "X-Plex-Version": "1.0.0",
        "X-Plex-Device": "ClipShare Web",
        "X-Plex-Platform": "Web",
        "X-Plex-Platform-Version": "1.0.0",
        "Content-Type": "application/x-www-form-urlencoded"
      }
    })

    const data = pinResponse.data as any
    const { id: pinId, code: pinCode } = data

    // Store the PIN in our database
    const plexPin = await prisma.plexPin.create({
      data: {
        pinId: pinId.toString(),
        pinCode: pinCode.toString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
      }
    })

    // Generate the auth URL for the user to visit
    const authUrl = `https://app.plex.tv/auth#?clientID=${plexConfig.clientId}&code=${pinCode}&context[device][product]=ClipShare&context[device][version]=1.0.0&context[device][platform]=Web&context[device][platformVersion]=1.0.0`

    return NextResponse.json({
      success: true,
      pinId: plexPin.id,
      pinCode: pinCode.toString(),
      authUrl,
      expiresAt: plexPin.expiresAt
    })
  } catch (error) {
    console.error("Error generating Plex PIN:", error)
    
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number }; code?: string }
      if (axiosError.response?.status === 401) {
        return NextResponse.json(
          { error: "Invalid Plex client ID" },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { error: "Failed to generate Plex PIN" },
      { status: 500 }
    )
  }
}
