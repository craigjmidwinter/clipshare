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

    // Get Plex configuration
    const plexConfig = await prisma.plexConfig.findFirst({
      where: { isActive: true }
    })

    if (!plexConfig) {
      return NextResponse.json({ error: "Plex not configured" }, { status: 400 })
    }

    // Get the user's personal Plex token from their PIN exchange
    const userPlexPin = await prisma.plexPin.findFirst({
      where: { 
        userId: session.user.id,
        token: { not: null }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!userPlexPin?.token) {
      return NextResponse.json({ error: "No valid Plex authentication found for user" }, { status: 400 })
    }

    const plexToken = userPlexPin.token

    console.log(`Fetching Plex server users for user ${session.user.id} with token: ${plexToken?.substring(0, 10)}...`)

    // Use the correct endpoint for server users (shared libraries)
    // Try JSON first, fallback to XML if needed
    const serverUsersUrl = "https://plex.tv/api/users"
    
    let response: any
    let plexUsers: any[] = []
    
    // First try with JSON
    try {
      const jsonHeaders = {
        "X-Plex-Token": plexToken,
        "X-Plex-Client-Identifier": plexConfig.clientId,
        "Accept": "application/json",
      }
      
      console.log(`Making JSON request to: ${serverUsersUrl}`)
      response = await axios.get(serverUsersUrl, { headers: jsonHeaders })
      
      console.log(`Plex API response status: ${response.status}`)
      console.log(`Plex API response data:`, JSON.stringify(response.data, null, 2))
      
      if (response.status === 200) {
        const data = response.data as any
        
        if (data.MediaContainer && data.MediaContainer.User) {
          // XML structure returned as JSON
          plexUsers = Array.isArray(data.MediaContainer.User) ? data.MediaContainer.User : [data.MediaContainer.User]
        } else if (data.users) {
          // JSON structure
          plexUsers = data.users
        } else if (Array.isArray(data)) {
          // Direct array
          plexUsers = data
        }
      }
    } catch (error) {
      console.log(`JSON request failed, trying XML:`, error)
    }
    
    // If JSON didn't work or returned empty, try XML
    if (plexUsers.length === 0) {
      try {
        const xmlHeaders = {
          "X-Plex-Token": plexToken,
          "X-Plex-Client-Identifier": plexConfig.clientId,
          "Accept": "application/xml",
        }
        
        console.log(`Making XML request to: ${serverUsersUrl}`)
        response = await axios.get(serverUsersUrl, { headers: xmlHeaders })
        
        console.log(`Plex XML API response status: ${response.status}`)
        console.log(`Plex XML API response data:`, response.data)
        
        if (response.status === 200) {
          // Parse XML response
          const xmlData = response.data
          // Simple XML parsing - look for User elements
          const userMatches = xmlData.match(/<User[^>]*>[\s\S]*?<\/User>/g) || []
          
          plexUsers = userMatches.map((userXml: string) => {
            const idMatch = userXml.match(/id="([^"]*)"/)
            const usernameMatch = userXml.match(/username="([^"]*)"/)
            const emailMatch = userXml.match(/email="([^"]*)"/)
            const titleMatch = userXml.match(/title="([^"]*)"/)
            const thumbMatch = userXml.match(/thumb="([^"]*)"/)
            
            return {
              id: idMatch ? idMatch[1] : null,
              username: usernameMatch ? usernameMatch[1] : null,
              email: emailMatch ? emailMatch[1] : null,
              title: titleMatch ? titleMatch[1] : null,
              thumb: thumbMatch ? thumbMatch[1] : null,
            }
          })
        }
      } catch (error) {
        console.log(`XML request also failed:`, error)
      }
    }
    
    if (response?.status !== 200) {
      throw new Error(`Failed to fetch users from Plex: ${response?.status} ${response?.statusText}`)
    }

    console.log(`Found ${plexUsers.length} server users`)
    console.log(`Current user Plex ID: ${session.user.plexUserId}`)

    // Filter out the current user and format the response
    const availableUsers = plexUsers
      .filter((user: any) => {
        console.log(`Checking user: ${user.username || user.title} (ID: ${user.id}, UUID: ${user.uuid})`)
        // Compare numeric IDs
        return user.id?.toString() !== session.user.plexUserId
      })
      .map((user: any) => ({
        id: user.uuid || user.id,
        username: user.username || user.title,
        email: user.email,
        title: user.title,
        thumb: user.thumb,
        hasPassword: user.hasPassword,
        restricted: user.restricted,
        home: user.home,
        guest: user.guest,
        admin: user.admin,
        protected: user.protected
      }))

    console.log(`Filtered to ${availableUsers.length} available users`)

    return NextResponse.json({ 
      success: true, 
      users: availableUsers
    })
  } catch (error) {
    console.error("Error fetching Plex users:", error)
    
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number }; code?: string }
      if (axiosError.response?.status === 401) {
        return NextResponse.json(
          { error: "Invalid Plex token" },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { error: "Failed to fetch Plex users" },
      { status: 500 }
    )
  }
}
