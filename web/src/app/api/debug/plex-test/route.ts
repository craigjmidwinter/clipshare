import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import axios from "axios"

export async function GET(request: NextRequest) {
  try {
    console.log("=== PLEX CONFIGURATION TEST ===")
    
    // Get Plex configuration
    const plexConfig = await prisma.plexConfig.findFirst({
      where: { isActive: true }
    })

    if (!plexConfig) {
      console.log("❌ No Plex configuration found")
      return NextResponse.json({ error: "No Plex configuration found" }, { status: 400 })
    }

    console.log("✅ Plex config found:", {
      serverUrl: plexConfig.serverUrl,
      hasToken: !!plexConfig.serverToken,
      tokenLength: plexConfig.serverToken?.length
    })

    // Test basic connection to Plex server
    console.log("Testing connection to Plex server...")
    const testUrl = `${plexConfig.serverUrl}/library/sections`
    console.log("Test URL:", testUrl)
    
    try {
      const testResponse = await axios.get(testUrl, {
        headers: {
          "X-Plex-Token": plexConfig.serverToken,
          "Accept": "application/json"
        },
        timeout: 10000
      })
      
      console.log("✅ Plex server connection successful:", testResponse.status)
      console.log("Response data:", JSON.stringify(testResponse.data, null, 2))
      
    } catch (testError) {
      console.log("❌ Plex server connection failed:", testError)
      return NextResponse.json({ 
        error: "Plex server connection failed", 
        details: testError instanceof Error ? testError.message : "Unknown error"
      }, { status: 500 })
    }

    // Test with a sample plexKey (you'll need to provide a real one)
    const { searchParams } = new URL(request.url)
    const testPlexKey = searchParams.get('plexKey')
    
    if (testPlexKey) {
      console.log("Testing with plexKey:", testPlexKey)
      
      try {
        const mediaUrl = `${plexConfig.serverUrl}${testPlexKey}`
        console.log("Media URL:", mediaUrl)
        
        const mediaResponse = await axios.get(mediaUrl, {
          headers: {
            "X-Plex-Token": plexConfig.serverToken,
            "Accept": "application/json"
          },
          timeout: 10000
        })
        
        console.log("✅ Media info fetch successful:", mediaResponse.status)
        const mediaData = mediaResponse.data as any
        
        if (mediaData.MediaContainer?.Metadata?.[0]?.Media?.[0]?.Part?.[0]?.id) {
          const partId = mediaData.MediaContainer.Metadata[0].Media[0].Part[0].id
          console.log("✅ Part ID found:", partId)
          
          const downloadUrl = `${plexConfig.serverUrl}/library/parts/${partId}/file?download=1&X-Plex-Token=${plexConfig.serverToken}`
          console.log("Download URL:", downloadUrl)
          
          return NextResponse.json({
            success: true,
            plexConfig: {
              serverUrl: plexConfig.serverUrl,
              hasToken: !!plexConfig.serverToken
            },
            mediaData: mediaData.MediaContainer.Metadata[0],
            partId,
            downloadUrl
          })
        } else {
          console.log("❌ No part ID found in media data")
          return NextResponse.json({ 
            error: "No part ID found in media data",
            mediaData 
          }, { status: 400 })
        }
        
      } catch (mediaError) {
        console.log("❌ Media info fetch failed:", mediaError)
        return NextResponse.json({ 
          error: "Media info fetch failed", 
          details: mediaError instanceof Error ? mediaError.message : "Unknown error"
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      plexConfig: {
        serverUrl: plexConfig.serverUrl,
        hasToken: !!plexConfig.serverToken
      },
      message: "Plex configuration is valid. Add ?plexKey=/library/metadata/XXXXX to test media fetching."
    })

  } catch (error) {
    console.error("Test error:", error)
    return NextResponse.json({ 
      error: "Test failed", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
