import { NextRequest, NextResponse } from "next/server"
import { WorkspaceProcessingService } from "@/lib/processing-service"

export async function POST(request: NextRequest) {
  try {
    const { workspaceId, plexKey, plexServerId, contentTitle } = await request.json()

    if (!workspaceId || !plexKey || !plexServerId || !contentTitle) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("=== MANUAL PROCESSING TEST ===")
    console.log("Workspace ID:", workspaceId)
    console.log("Plex Key:", plexKey)
    console.log("Plex Server ID:", plexServerId)
    console.log("Content Title:", contentTitle)

    const processingService = WorkspaceProcessingService.getInstance()
    
    // Create a test job ID
    const testJobId = `test-${Date.now()}`
    
    console.log("Starting manual processing test...")
    
    // Process in background
    processingService.processWorkspace(testJobId, {
      workspaceId,
      plexKey,
      plexServerId,
      contentTitle
    }).catch(error => {
      console.error("Manual processing test error:", error)
    })

    return NextResponse.json({ 
      success: true, 
      message: "Manual processing test started",
      jobId: testJobId,
      workspaceId
    })

  } catch (error) {
    console.error("Manual test error:", error)
    return NextResponse.json({ 
      error: "Manual test failed", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
