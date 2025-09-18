import { NextRequest, NextResponse } from "next/server"
import { exec } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import youtubedl from "youtube-dl-exec"

const execAsync = promisify(exec)

// Helper function to find yt-dlp binary
async function findYtDlpBinary(): Promise<string | undefined> {
  // If explicitly set via environment variable, use that
  if (process.env.YT_DLP_PATH) {
    return process.env.YT_DLP_PATH
  }

  try {
    // Try to find yt-dlp in PATH
    const { stdout } = await execAsync('which yt-dlp')
    return stdout.trim()
  } catch {
    // If not found in PATH, try common locations
    const commonPaths = [
      '/usr/local/bin/yt-dlp',
      '/usr/bin/yt-dlp',
      '/opt/homebrew/bin/yt-dlp',
      '/snap/bin/yt-dlp'
    ]
    
    for (const binaryPath of commonPaths) {
      try {
        await fs.access(binaryPath)
        return binaryPath
      } catch {
        // Continue to next path
      }
    }
  }
  
  return undefined // Let youtube-dl-exec use its default
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get("url")

    if (!url) {
      return NextResponse.json({ error: "URL parameter is required" }, { status: 400 })
    }

    // Validate YouTube URL
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 })
    }

    console.log(`Fetching YouTube metadata for: ${url}`)

    // 1) Try YouTube oEmbed first (no API key required)
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
      const res = await fetch(oembedUrl, {
        // Match a realistic UA to avoid some region/age walls
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'accept': 'application/json, text/javascript, */*; q=0.01'
        }
      })
      if (res.ok) {
        const oe: any = await res.json()
        const metadata = {
          title: oe.title || 'Untitled Video',
          description: '',
          duration: null as number | null,
          thumbnailUrl: oe.thumbnail_url || '',
          uploader: oe.author_name || '',
          uploadDate: '',
          viewCount: 0
        }
        return NextResponse.json({ success: true, metadata })
      }
    } catch (e) {
      // Ignore and fall back to youtube-dl-exec
      console.warn('oEmbed fetch failed, falling back to youtube-dl-exec')
    }

    // 2) Fallback: youtube-dl-exec for richer fields
    const ytDlpPath = await findYtDlpBinary()
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      ],
      // Use detected yt-dlp binary if available
      ...(ytDlpPath && { binaryPath: ytDlpPath })
    })

    const metadata = {
      title: (info as any).title || 'Untitled Video',
      description: (info as any).description || '',
      duration: (info as any).duration ? (info as any).duration * 1000 : null,
      thumbnailUrl: (info as any).thumbnail || (info as any).thumbnails?.[0]?.url || '',
      uploader: (info as any).uploader || '',
      uploadDate: (info as any).upload_date || '',
      viewCount: (info as any).view_count || 0
    }

    return NextResponse.json({ success: true, metadata })

  } catch (error) {
    console.error('Error fetching YouTube metadata:', error)
    return NextResponse.json(
      { error: "Failed to fetch video metadata" }, 
      { status: 500 }
    )
  }
}

