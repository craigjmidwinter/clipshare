import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ProcessingRecoveryService } from "@/lib/processing-recovery-service"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only allow recovery to be triggered by authenticated users
    // In a production environment, you might want to restrict this to admins only
    console.log(`Processing recovery triggered by user: ${session.user.id}`)

    const recoveryService = ProcessingRecoveryService.getInstance()
    const stats = await recoveryService.recoverStuckProcessingJobs()

    return NextResponse.json({ 
      success: true,
      message: "Processing recovery completed",
      stats
    })
  } catch (error) {
    console.error("Error during manual processing recovery:", error)
    return NextResponse.json(
      { error: "Failed to recover stuck processing jobs" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const recoveryService = ProcessingRecoveryService.getInstance()
    const summary = await recoveryService.getProcessingStatusSummary()

    return NextResponse.json({ 
      success: true,
      summary
    })
  } catch (error) {
    console.error("Error fetching processing status summary:", error)
    return NextResponse.json(
      { error: "Failed to fetch processing status summary" },
      { status: 500 }
    )
  }
}
