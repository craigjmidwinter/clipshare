"use client"

import { signIn, getSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface PlexPinResponse {
  success: boolean
  pinId: string
  pinCode: string
  authUrl: string
  expiresAt: string
}

interface PlexExchangeResponse {
  success: boolean
  user: {
    id: string
    name: string
    email: string
    image: string
    plexUserId: string
    plexUsername: string
    onboardingCompleted: boolean
  }
  authToken: string
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showCredentials, setShowCredentials] = useState(false)
  const [credentials, setCredentials] = useState({ email: "", password: "" })
  const [plexConfigured, setPlexConfigured] = useState<boolean | null>(null)
  const [plexPin, setPlexPin] = useState<PlexPinResponse | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if Plex is globally configured
    fetch("/api/plex/status")
      .then(res => res.json())
      .then(data => {
        if (!data.isConfigured) {
          router.push("/admin-setup")
        } else {
          setPlexConfigured(true)
        }
      })
      .catch(err => {
        console.error("Error checking Plex status:", err)
        setPlexConfigured(false)
      })

    // Check if user is already logged in
    getSession().then((session) => {
      if (session) {
        if (session.user.onboardingCompleted) {
          router.push("/workspaces")
        } else {
          router.push("/welcome")
        }
      }
    })
  }, [router])

  const handlePlexSignIn = async () => {
    setIsLoading(true)
    setError("")
    
    try {
      // Generate a PIN
      const pinResponse = await fetch("/api/plex/pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const pinData: PlexPinResponse = await pinResponse.json()

      if (!pinData.success) {
        throw new Error("Failed to generate Plex PIN")
      }

      setPlexPin(pinData)

      // Open Plex auth URL in a new window
      const authWindow = window.open(
        pinData.authUrl,
        "plex-auth",
        "width=600,height=700,scrollbars=yes,resizable=yes"
      )

      if (!authWindow) {
        throw new Error("Please allow popups to continue with Plex authentication")
      }

      // Start polling for PIN completion
      setIsPolling(true)
      pollForPinCompletion(pinData.pinId)

    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during Plex authentication.")
      setIsLoading(false)
    }
  }

  const pollForPinCompletion = async (pinId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const exchangeResponse = await fetch("/api/plex/exchange", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ pinId }),
        })

        const exchangeData: PlexExchangeResponse = await exchangeResponse.json()

        if (exchangeData.success) {
          clearInterval(pollInterval)
          setIsPolling(false)
          setIsLoading(false)
          
          // Create a session using NextAuth
          const result = await signIn("credentials", {
            email: exchangeData.user.email,
            password: "plex-auth", // Special password for Plex auth
            redirect: false,
          })

          if (result?.ok) {
            if (exchangeData.user.onboardingCompleted) {
              router.push("/workspaces")
            } else {
              router.push("/welcome")
            }
          } else {
            setError("Failed to create session after Plex authentication.")
          }
        }
      } catch (err) {
        console.error("Error polling for PIN completion:", err)
      }
    }, 2000) // Poll every 2 seconds

    // Stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval)
      setIsPolling(false)
      setIsLoading(false)
      setError("PIN authentication timed out. Please try again.")
    }, 10 * 60 * 1000)
  }

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    
    try {
      const result = await signIn("credentials", {
        email: credentials.email,
        password: credentials.password,
        redirect: false,
      })
      
      if (result?.error) {
        setError("Invalid email or password.")
      } else if (result?.ok) {
        router.push("/workspaces")
      }
    } catch {
      setError("An error occurred during sign in.")
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading while checking Plex configuration
  if (plexConfigured === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-white text-lg">Checking configuration...</p>
        </div>
      </div>
    )
  }

  // Don't render if Plex is not configured (will redirect to admin-setup)
  if (!plexConfigured) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Clipshare</h1>
          <p className="text-gray-300 text-lg">Internal Video Collaboration Tool</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="space-y-6">
            {/* Plex Sign In Button */}
            <div>
              {!plexPin ? (
                <button
                  onClick={handlePlexSignIn}
                  disabled={isLoading || isPolling}
                  className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  aria-label="Sign in with Plex"
                >
                  {isLoading || isPolling ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5 mr-3"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      Sign in with Plex
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">
                      Enter this code on plex.tv:
                    </p>
                    <div className="bg-gray-100 rounded-lg p-4">
                      <code className="text-2xl font-mono font-bold text-gray-900">
                        {plexPin.pinCode}
                      </code>
                    </div>
                  </div>
                  
                  {isPolling && (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">
                        Waiting for you to authorize on plex.tv...
                      </p>
                    </div>
                  )}
                  
                  <button
                    onClick={() => {
                      setPlexPin(null)
                      setIsPolling(false)
                      setIsLoading(false)
                    }}
                    className="w-full text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    Cancel and try again
                  </button>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            {/* Fallback Credentials */}
            <div>
              <button
                onClick={() => setShowCredentials(!showCredentials)}
                className="w-full text-sm text-gray-600 hover:text-gray-800 underline"
                aria-expanded={showCredentials}
                aria-controls="credentials-form"
              >
                {showCredentials ? "Hide" : "Show"} email/password sign in
              </button>
              
              {showCredentials && (
                <form
                  id="credentials-form"
                  onSubmit={handleCredentialsSignIn}
                  className="mt-4 space-y-4"
                >
                  <div>
                    <label htmlFor="email" className="sr-only">
                      Email address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={credentials.email}
                      onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                      className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-800 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                      placeholder="Email address"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="sr-only">
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-800 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                      placeholder="Password"
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? "Signing in..." : "Sign in"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-400 text-sm">
          <p>Sign in to access your video collaboration workspaces</p>
        </div>
      </div>
    </div>
  )
}
