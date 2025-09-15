"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [plexConfigured, setPlexConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    if (status === "loading") return

    // Check if Plex is globally configured
    fetch("/api/plex/status")
      .then(res => res.json())
      .then(data => {
        if (!data.isConfigured) {
          router.push("/admin-setup")
          return
        }
        setPlexConfigured(true)
        
        // Now check authentication status
        if (status === "unauthenticated") {
          router.push("/login")
        } else if (session?.user?.onboardingCompleted) {
          router.push("/workspaces")
        } else {
          router.push("/welcome")
        }
      })
      .catch(err => {
        console.error("Error checking Plex status:", err)
        router.push("/admin-setup")
      })
  }, [status, session, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg">
          {plexConfigured === null ? "Checking configuration..." : "Loading..."}
        </p>
      </div>
    </div>
  )
}
