import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import axios from "axios"
import { promises as fs } from 'fs'
import { createWriteStream } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const { plexKey } = await request.json()

    if (!plexKey) {
      return NextResponse.json({ error: "plexKey is required" }, { status: 400 })
    }

    console.log("=== SIMPLE DOWNLOAD TEST ===")
    console.log("Plex Key:", plexKey)

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
      hasToken: !!plexConfig.serverToken
    })

    // Get media info to extract the part ID
    const mediaUrl = `${plexConfig.serverUrl}${plexKey}`
    console.log(`Fetching media info from: ${mediaUrl}`)
    
    const mediaResponse = await axios.get(mediaUrl, {
      headers: {
        "X-Plex-Token": plexConfig.serverToken,
        "Accept": "application/json"
      },
      timeout: 30000
    })
    
    const mediaData = mediaResponse.data as any
    console.log("Media data received successfully")
    
    if (!mediaData.MediaContainer?.Metadata?.[0]?.Media?.[0]?.Part?.[0]?.id) {
      throw new Error("Invalid media data structure - no part ID found")
    }
    
    const mediaContainer = mediaData.MediaContainer.Metadata[0]
    const mediaPart = mediaContainer.Media[0].Part[0]
    const partId = mediaPart.id
    
    console.log(`Found part ID: ${partId}`)
    
    // Construct the download URL
    const downloadUrl = `${plexConfig.serverUrl}/library/parts/${partId}/file?download=1&X-Plex-Token=${plexConfig.serverToken}`
    console.log(`Download URL: ${downloadUrl}`)
    
    // Create test directory
    const testDir = path.join(process.cwd(), 'processed-files', 'download-test')
    await fs.mkdir(testDir, { recursive: true })
    
    const testFilePath = path.join(testDir, 'test-download.mkv')
    console.log(`Test file path: ${testFilePath}`)
    
    // Test download (just first 10MB to avoid downloading the full 1.5GB file)
    console.log("Starting test download (first 10MB)...")
    
    const downloadResponse = await axios.get(downloadUrl, {
      responseType: 'stream',
      timeout: 60000,
      headers: {
        'Range': 'bytes=0-10485759', // First 10MB
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-GB,en;q=0.9,en-US;q=0.8',
        'Connection': 'keep-alive',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
      }
    })
    
    console.log(`Download response status: ${downloadResponse.status}`)
    console.log(`Content-Length: ${downloadResponse.headers['content-length']}`)
    
    // Create write stream
    const writer = createWriteStream(testFilePath)
    
    // Pipe the download stream to file
    downloadResponse.data.pipe(writer)
    
    return new Promise((resolve) => {
      writer.on('finish', () => {
        console.log(`Test download completed: ${testFilePath}`)
        resolve(NextResponse.json({
          success: true,
          message: "Test download completed successfully",
          testFilePath,
          partId,
          downloadUrl
        }))
      })
      
      writer.on('error', (error) => {
        console.error('Download error:', error)
        resolve(NextResponse.json({ 
          error: "Download failed", 
          details: error.message 
        }, { status: 500 }))
      })
      
      downloadResponse.data.on('error', (error) => {
        console.error('Download stream error:', error)
        resolve(NextResponse.json({ 
          error: "Download stream failed", 
          details: error.message 
        }, { status: 500 }))
      })
    })

  } catch (error) {
    console.error("Download test error:", error)
    return NextResponse.json({ 
      error: "Download test failed", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
