import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import axios from "axios"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get("url")

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL required" }, { status: 400 })
    }

    // Get Plex configuration
    const plexConfig = await prisma.plexConfig.findFirst({
      where: { isActive: true }
    })

    if (!plexConfig) {
      return NextResponse.json({ error: "Plex not configured" }, { status: 400 })
    }

    // Construct full URL if imageUrl is relative
    let fullImageUrl: string
    if (imageUrl.startsWith('http')) {
      // Already a full URL
      fullImageUrl = imageUrl
    } else {
      // Relative URL, prepend server URL
      fullImageUrl = `${plexConfig.serverUrl}${imageUrl}`
    }
    
    // Add Plex token to the image URL
    const urlWithToken = new URL(fullImageUrl)
    urlWithToken.searchParams.set("X-Plex-Token", plexConfig.serverToken)

    // Fetch the image
    const response = await axios.get(urlWithToken.toString(), {
      responseType: "stream",
      headers: {
        "Accept": "image/*"
      }
    })

    // Return the image with appropriate headers
    return new NextResponse(response.data as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": response.headers["content-type"] || "image/jpeg",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      }
    })
  } catch (error) {
    console.error("Error proxying Plex image:", error)
    
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number }; code?: string }
      if (axiosError.response?.status === 401) {
        return NextResponse.json(
          { error: "Invalid Plex server token" },
          { status: 401 }
        )
      } else if (axiosError.response?.status === 404) {
        return NextResponse.json(
          { error: "Image not found" },
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { error: "Failed to fetch image" },
      { status: 500 }
    )
  }
}
