import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import axios from "axios"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get("url")
    const key = searchParams.get("key")
    const serverId = searchParams.get("serverId")

    // Get Plex configuration
    const plexConfig = await prisma.plexConfig.findFirst({
      where: { isActive: true }
    })

    if (!plexConfig) {
      return NextResponse.json({ error: "Plex not configured" }, { status: 400 })
    }

    let fullUrl: string
    let contentType: string
    let acceptHeader: string

    if (key && serverId) {
      // Video streaming request - use Plex's direct streaming API
      // Format: /library/parts/PART_ID/file?X-Plex-Token=TOKEN
      // First get the media info to extract the part ID
      const mediaUrl = `${plexConfig.serverUrl}${key}`
      console.log("Fetching media info from:", mediaUrl)
      
      const mediaResponse = await axios.get(mediaUrl, {
        headers: {
          "X-Plex-Token": plexConfig.serverToken,
          "Accept": "application/json"
        }
      })
      
      const mediaData = mediaResponse.data as any
      console.log("Media data received:", JSON.stringify(mediaData, null, 2))
      
      if (!mediaData.MediaContainer?.Metadata?.[0]?.Media?.[0]?.Part?.[0]?.id) {
        throw new Error("Invalid media data structure - no part ID found")
      }
      
      const mediaContainer = mediaData.MediaContainer.Metadata[0]
      const mediaPart = mediaContainer.Media[0].Part[0]
      const partId = mediaPart.id
      
      console.log("Part ID:", partId)
      
      // Use Plex's direct streaming endpoint
      fullUrl = `${plexConfig.serverUrl}/library/parts/${partId}/file`
      contentType = "video/mp4"
      acceptHeader = "video/*"
    } else if (imageUrl) {
      // Image request (existing functionality)
      if (imageUrl.startsWith('http')) {
        fullUrl = imageUrl
      } else {
        fullUrl = `${plexConfig.serverUrl}${imageUrl}`
      }
      contentType = "image/jpeg"
      acceptHeader = "image/*"
    } else {
      return NextResponse.json({ error: "URL or key/serverId required" }, { status: 400 })
    }
    
    // Add Plex token to the URL
    const urlWithToken = new URL(fullUrl)
    urlWithToken.searchParams.set("X-Plex-Token", plexConfig.serverToken)

    // Handle range requests for video seeking/scrubbing
    const range = request.headers.get("range")
    console.log("Range header:", range)
    
    const requestHeaders: Record<string, string> = {
      "Accept": acceptHeader,
      "User-Agent": "ClipShare/1.0"
    }
    
    // Forward range header to Plex if present
    if (range) {
      requestHeaders["Range"] = range
    }
    
    console.log("Fetching content from:", urlWithToken.toString())
    console.log("Request headers:", requestHeaders)
    
    // Fetch the content
    const response = await axios.get(urlWithToken.toString(), {
      responseType: "stream",
      headers: requestHeaders,
      validateStatus: (status) => {
        // Accept both 200 and 206 (partial content) responses
        return status === 200 || status === 206
      }
    })
    
    console.log("Content response status:", response.status)
    console.log("Response headers:", response.headers)

    // Prepare response headers
    const responseHeaders: Record<string, string> = {
      "Content-Type": response.headers["content-type"] || contentType,
      "Cache-Control": key ? "no-cache" : "public, max-age=3600",
      "Accept-Ranges": "bytes",
    }
    
    // Forward important headers from Plex for range requests
    if (response.headers["content-range"]) {
      responseHeaders["Content-Range"] = response.headers["content-range"]
    }
    if (response.headers["content-length"]) {
      responseHeaders["Content-Length"] = response.headers["content-length"]
    }

    // Return the content with appropriate headers
    return new NextResponse(response.data as BodyInit, {
      status: response.status,
      headers: responseHeaders
    })
  } catch (error) {
    console.error("Error proxying Plex content:", error)
    
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number }; code?: string }
      if (axiosError.response?.status === 401) {
        return NextResponse.json(
          { error: "Invalid Plex token" },
          { status: 401 }
        )
      } else if (axiosError.response?.status === 404) {
        return NextResponse.json(
          { error: "Plex content not found" },
          { status: 404 }
        )
      } else if (axiosError.code === "ECONNREFUSED") {
        return NextResponse.json(
          { error: "Cannot connect to Plex server" },
          { status: 503 }
        )
      }
    }
    
    return NextResponse.json(
      { error: "Failed to proxy Plex content" },
      { status: 500 }
    )
  }
}
