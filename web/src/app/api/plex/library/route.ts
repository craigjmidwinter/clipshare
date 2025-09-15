import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import axios from "axios"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const libraryKey = searchParams.get("libraryKey")
    const key = searchParams.get("key") // For fetching children of a specific item
    const search = searchParams.get("search")
    const type = searchParams.get("type") // "movie" or "episode"

    // Get Plex configuration
    const plexConfig = await prisma.plexConfig.findFirst({
      where: { isActive: true }
    })

    if (!plexConfig) {
      return NextResponse.json({ error: "Plex not configured" }, { status: 400 })
    }

    let plexUrl: string
    let params: any = {}

    if (key) {
      // Get children of a specific item (seasons/episodes)
      // The key already includes the full path, so we don't need to append /children
      plexUrl = `${plexConfig.serverUrl}${key}`
      console.log("Fetching children for key:", key, "URL:", plexUrl)
    } else if (libraryKey) {
      // Get content from specific library
      plexUrl = `${plexConfig.serverUrl}/library/sections/${libraryKey}/all`
      
      if (type) {
        // Plex type codes: 1=Movie, 2=Show, 4=Episode
        if (type === "movie") {
          params.type = 1
        } else if (type === "episode") {
          params.type = 4
        } else if (type === "show") {
          params.type = 2
        }
      }
      
      if (search) {
        params.title = search
      }
    } else {
      // Get all libraries
      plexUrl = `${plexConfig.serverUrl}/library/sections`
    }

    const headers = {
      "X-Plex-Token": plexConfig.serverToken,
      "Accept": "application/json",
    }

    const response = await axios.get(plexUrl, { 
      headers,
      params: Object.keys(params).length > 0 ? params : undefined
    })
    
    console.log("Plex API response status:", response.status)
    
    if (response.status !== 200) {
      console.error("Plex API error:", response.status, response.statusText)
      throw new Error(`Failed to fetch from Plex server: ${response.status} ${response.statusText}`)
    }

    if (key || libraryKey) {
      // Return content items (either children of a specific item or library content)
      const data = response.data as any
      console.log("Plex API response data:", JSON.stringify(data, null, 2))
      const items = data.MediaContainer.Metadata?.map((item: any) => ({
        key: item.key,
        title: item.title,
        summary: item.summary,
        year: item.year,
        duration: item.duration,
        thumb: item.thumb,
        art: item.art,
        type: item.type,
        index: item.index, // For seasons/episodes
        leafCount: item.leafCount, // For seasons (episode count)
        // For episodes, include show info
        ...(item.type === "episode" && {
          showTitle: item.grandparentTitle,
          seasonNumber: item.parentIndex,
          episodeNumber: item.index,
        })
      })) || []

      return NextResponse.json({ 
        success: true, 
        items,
        totalSize: data.MediaContainer.totalSize || 0
      })
    } else {
      // Return libraries
      const data = response.data as any
      const libraries = data.MediaContainer.Directory.map((lib: any) => ({
        key: lib.key,
        title: lib.title,
        type: lib.type,
        agent: lib.agent,
        scanner: lib.scanner,
        language: lib.language,
        updatedAt: lib.updatedAt,
        createdAt: lib.createdAt,
        scannedAt: lib.scannedAt,
        content: lib.content,
        directory: lib.directory,
        contentChangedAt: lib.contentChangedAt,
        hidden: lib.hidden,
        Location: lib.Location,
      }))

      return NextResponse.json({ 
        success: true, 
        libraries 
      })
    }
  } catch (error) {
    console.error("Error fetching Plex library:", error)
    
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number }; code?: string }
      if (axiosError.response?.status === 401) {
        return NextResponse.json(
          { error: "Invalid Plex server token" },
          { status: 401 }
        )
      } else if (axiosError.code === "ECONNREFUSED") {
        return NextResponse.json(
          { error: "Cannot connect to Plex server" },
          { status: 503 }
        )
      }
    }
    
    return NextResponse.json(
      { error: "Failed to fetch library data" },
      { status: 500 }
    )
  }
}
