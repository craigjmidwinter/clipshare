import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

export async function POST(request: NextRequest) {
  try {
    const { clientId, serverUrl, serverToken } = await request.json()

    if (!clientId || !serverUrl || !serverToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Test Plex server connection
    const plexUrl = `${serverUrl}/library/sections`
    const headers = {
      "X-Plex-Token": serverToken,
      "Accept": "application/json",
    }

    const response = await axios.get(plexUrl, { headers })
    
    if (response.status !== 200) {
      throw new Error("Failed to connect to Plex server")
    }

    // Extract libraries from response
    const data = response.data as any
    const libraries = data.MediaContainer.Directory.map((lib: any) => ({
      key: lib.key,
      title: lib.title,
      type: lib.type,
    }))

    return NextResponse.json({ 
      success: true, 
      libraries,
      serverInfo: {
        name: data.MediaContainer.friendlyName,
        version: data.MediaContainer.version,
      }
    })
  } catch (error) {
    console.error("Error testing Plex connection:", error)
    
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number }; code?: string }
      if (axiosError.response?.status === 401) {
        return NextResponse.json(
          { error: "Invalid server token" },
          { status: 400 }
        )
      } else if (axiosError.code === "ECONNREFUSED") {
        return NextResponse.json(
          { error: "Cannot connect to Plex server. Check the server URL." },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { error: "Failed to connect to Plex server" },
      { status: 500 }
    )
  }
}
