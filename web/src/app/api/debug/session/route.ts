import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    return NextResponse.json({ 
      success: true, 
      session: {
        user: session?.user ? {
          id: session.user.id,
          email: session.user.email,
          onboardingCompleted: session.user.onboardingCompleted,
          plexUserId: session.user.plexUserId,
          plexUsername: session.user.plexUsername,
        } : null,
        status: session ? "authenticated" : "unauthenticated"
      }
    })
  } catch (error) {
    console.error("Error checking session:", error)
    return NextResponse.json(
      { error: "Failed to check session" },
      { status: 500 }
    )
  }
}
