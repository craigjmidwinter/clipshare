import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const secondParam = searchParams.get("second")
    if (!secondParam) {
      return NextResponse.json({ error: "second query param required" }, { status: 400 })
    }

    const second = Math.max(0, parseInt(secondParam, 10) || 0)
    const workspaceId = params.id
    const framesDir = path.join(process.cwd(), 'processed-files', workspaceId, 'frames')
    
    // Try shot-aware frames first
    try {
      const metadataFile = path.join(process.cwd(), 'processed-files', workspaceId, 'frame_metadata.json')
      const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf-8'))
      
      // Find the closest frame time to the requested second
      const closestTime = metadata.frameTimes.reduce((prev: number, curr: number) => 
        Math.abs(curr - second) < Math.abs(prev - second) ? curr : prev
      )
      
      const frameIndex = metadata.frameTimes.indexOf(closestTime) + 1
      const frameName = `shot_frame_${String(frameIndex).padStart(6, '0')}.jpg`
      const framePath = path.join(framesDir, frameName)
      
      const file = await fs.readFile(framePath)
      return new NextResponse(file, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      })
    } catch {
      // Fallback to old frame naming convention
      const frameIndex = second + 1
      const frameName = `frame_s${String(frameIndex).padStart(6, '0')}.jpg`
      const framePath = path.join(framesDir, frameName)

      try {
        const file = await fs.readFile(framePath)
        return new NextResponse(file, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000, immutable'
          }
        })
      } catch {
        // If not found, try nearest previous frame to avoid gaps
        for (let i = frameIndex; i >= Math.max(1, frameIndex - 5); i--) {
          const altName = `frame_s${String(i).padStart(6, '0')}.jpg`
          const altPath = path.join(framesDir, altName)
          try {
            const fallback = await fs.readFile(altPath)
            return new NextResponse(fallback, {
              headers: {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'public, max-age=60'
              }
            })
          } catch {}
        }
        return NextResponse.json({ error: 'frame not found' }, { status: 404 })
      }
    }
  } catch (error) {
    console.error('frames route error', error)
    return NextResponse.json({ error: 'failed to load frame' }, { status: 500 })
  }
}


