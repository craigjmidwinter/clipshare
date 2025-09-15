import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import axios from "axios"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get("key")
    const serverId = searchParams.get("serverId")

    if (!key || !serverId) {
      return NextResponse.json({ error: "key and serverId are required" }, { status: 400 })
    }

    // Get Plex configuration
    const plexConfig = await prisma.plexConfig.findFirst({
      where: { isActive: true }
    })

    if (!plexConfig) {
      return NextResponse.json({ error: "Plex not configured" }, { status: 400 })
    }

    // First, get media info to determine the best transcoding parameters
    const mediaUrl = `${plexConfig.serverUrl}${key}`
    console.log("Fetching media info from:", mediaUrl)
    
    const mediaResponse = await axios.get(mediaUrl, {
      headers: {
        "X-Plex-Token": plexConfig.serverToken,
        "Accept": "application/json",
        "X-Plex-Product": "ClipShare",
        "X-Plex-Version": "1.0",
        "X-Plex-Client-Identifier": "clipshare-web",
        "X-Plex-Device": "Web",
        "X-Plex-Device-Name": "ClipShare Web",
        "X-Plex-Platform": "Web"
      }
    })
    
    const mediaData = mediaResponse.data as any
    console.log("Media data received:", JSON.stringify(mediaData, null, 2))
    console.log("Media response status:", mediaResponse.status)
    
    if (!mediaData.MediaContainer?.Metadata?.[0]?.Media?.[0]) {
      throw new Error("Invalid media data structure - no media found")
    }
    
    const mediaContainer = mediaData.MediaContainer.Metadata[0]
    const media = mediaContainer.Media[0]
    const mediaIndex = 0 // Use first media stream
    const partIndex = 0 // Use first part

    // Generate a unique session ID (like Plex Web does)
    const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    
    // Check if we need to force transcoding based on audio codec
    const needsTranscoding = media.audioCodec && !['aac', 'mp3'].includes(media.audioCodec.toLowerCase())
    console.log("Audio codec:", media.audioCodec, "Needs transcoding:", needsTranscoding)
    
    // Use DASH protocol like Plex Web (more reliable than HLS for transcoding)
    const decisionParams = new URLSearchParams({
      hasMDE: "1",
      path: key,
      mediaIndex: mediaIndex.toString(),
      partIndex: partIndex.toString(),
      protocol: "dash", // Use DASH like Plex Web
      fastSeek: "1",
      directPlay: needsTranscoding ? "0" : "1",
      directStream: "1",
      subtitleSize: "100",
      audioBoost: "100",
      location: "wan",
      addDebugOverlay: "0",
      autoAdjustQuality: "0",
      directStreamAudio: "0",
      autoAdjustSubtitle: "1",
      mediaBufferSize: "102400",
      session: sessionId,
      subtitles: "burn",
      "Accept-Language": "en-GB",
      "X-Plex-Session-Identifier": sessionId,
      "X-Plex-Client-Profile-Extra": "append-transcode-target-codec(type=videoProfile&context=streaming&videoCodec=h264%2Chevc&audioCodec=aac&protocol=dash)",
      "X-Plex-Incomplete-Segments": "1",
      "X-Plex-Product": "ClipShare",
      "X-Plex-Version": "1.0",
      "X-Plex-Client-Identifier": "clipshare-web",
      "X-Plex-Platform": "Chrome",
      "X-Plex-Platform-Version": "140.0",
      "X-Plex-Features": "external-media,indirect-media,hub-style-list",
      "X-Plex-Model": "standalone",
      "X-Plex-Device": "OSX",
      "X-Plex-Device-Name": "ClipShare Web",
      "X-Plex-Device-Screen-Resolution": "1920x1080",
      "X-Plex-Token": plexConfig.serverToken,
      "X-Plex-Language": "en-GB"
    })
    
    const decisionUrl = `${plexConfig.serverUrl}/video/:/transcode/universal/decision?${decisionParams.toString()}`
    console.log("Decision URL:", decisionUrl)
    
    // Try to get the decision first
    let streamUrl: string
    try {
      const decisionResponse = await axios.get(decisionUrl, {
        headers: {
          "X-Plex-Token": plexConfig.serverToken,
          "Accept": "text/plain, */*; q=0.01",
          "Accept-Language": "en-GB",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
        }
      })
      
      console.log("Decision response:", decisionResponse.data)
      
      // If decision is successful, use the DASH start endpoint
      const startParams = new URLSearchParams(decisionParams)
      streamUrl = `${plexConfig.serverUrl}/video/:/transcode/universal/start.mpd?${startParams.toString()}`
    } catch (decisionError) {
      console.warn("Decision endpoint failed, using direct start URL:", decisionError)
      // Fallback to direct start URL
      const startParams = new URLSearchParams(decisionParams)
      streamUrl = `${plexConfig.serverUrl}/video/:/transcode/universal/start.mpd?${startParams.toString()}`
    }
    
    console.log("DASH URL:", streamUrl)
    console.log("Session ID:", sessionId)
    console.log("Plex Token (first 10 chars):", plexConfig.serverToken.substring(0, 10) + "...")
    console.log("Media info:", {
      title: mediaContainer.title,
      type: mediaContainer.type,
      duration: mediaContainer.duration,
      mediaFormat: media.container,
      videoCodec: media.videoCodec,
      audioCodec: media.audioCodec
    })

    // Return the DASH URL directly (like Plex Web does)
    return NextResponse.json({
      dashUrl: streamUrl,
      sessionId: sessionId,
      plexToken: plexConfig.serverToken,
      debug: {
        serverUrl: plexConfig.serverUrl,
        key: key,
        serverId: serverId,
        mediaIndex: mediaIndex,
        partIndex: partIndex,
        tokenLength: plexConfig.serverToken.length,
        tokenPrefix: plexConfig.serverToken.substring(0, 10),
        needsTranscoding: needsTranscoding
      }
    }, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Range, Content-Range, Content-Length, Content-Type"
      }
    })
  } catch (error) {
    console.error("Error fetching HLS stream:", error)
    
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
      { error: "Failed to fetch HLS stream" },
      { status: 500 }
    )
  }
}
