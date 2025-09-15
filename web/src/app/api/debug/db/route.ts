import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    console.log("Testing database connection...")
    
    // Test basic database connection
    const userCount = await prisma.user.count()
    console.log("User count:", userCount)
    
    // Check for existing Plex configs
    const plexConfigs = await prisma.plexConfig.findMany()
    console.log("Existing Plex configs:", plexConfigs)
    
    // Check for users with onboarding completed
    const completedUsers = await prisma.user.findMany({
      where: { onboardingCompleted: true },
      select: { id: true, email: true, onboardingCompleted: true }
    })
    console.log("Users with completed onboarding:", completedUsers)
    
    return Response.json({ 
      success: true, 
      userCount, 
      plexConfigs, 
      completedUsers 
    })
  } catch (error) {
    console.error("Database test error:", error)
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}
