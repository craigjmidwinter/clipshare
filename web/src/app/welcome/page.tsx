"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

interface WizardData {
  serverUrl: string
  serverToken: string
}

interface PlexLibrary {
  key: string
  title: string
  type: string
}

export default function WelcomeWizard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [wizardData, setWizardData] = useState<WizardData>({
    serverUrl: "",
    serverToken: "",
  })
  const [libraries, setLibraries] = useState<PlexLibrary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [onboardingCompleted, setOnboardingCompleted] = useState(false)

  useEffect(() => {
    console.log("Welcome page useEffect:", { 
      status, 
      onboardingCompleted: session?.user?.onboardingCompleted, 
      localOnboardingCompleted: onboardingCompleted 
    })
    
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated" && (session?.user?.onboardingCompleted || onboardingCompleted)) {
      console.log("Redirecting to workspaces...")
      router.push("/workspaces")
    } else if (status === "authenticated") {
      // Check if Plex is already configured
      checkExistingConfig()
    }
  }, [status, session?.user?.onboardingCompleted, onboardingCompleted, router])

  const checkExistingConfig = async () => {
    try {
      const response = await fetch("/api/plex/config")
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.config) {
          // Plex is already configured, skip to completion
          setCurrentStep(4)
          setWizardData({
            serverUrl: data.config.serverUrl,
            serverToken: data.config.serverToken,
          })
        }
      }
    } catch {
      // Config doesn't exist or error, continue with wizard
      console.log("No existing Plex config found")
    }
  }

  const handleInputChange = (field: keyof WizardData, value: string) => {
    setWizardData(prev => ({ ...prev, [field]: value }))
    setError("")
  }

  const testPlexConnection = async () => {
    setIsLoading(true)
    setError("")
    
    try {
      const response = await fetch("/api/plex/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...wizardData,
          clientId: "800c9d71-8ba6-4273-83a4-a71c6dfb3e85", // Pre-filled client ID
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to connect to Plex server")
      }
      
      setLibraries(data.libraries || [])
      setCurrentStep(4)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to Plex server")
    } finally {
      setIsLoading(false)
    }
  }

  const completeOnboarding = async () => {
    setIsLoading(true)
    setError("")
    
    try {
      // Save Plex configuration
      const configResponse = await fetch("/api/plex/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...wizardData,
          clientId: "800c9d71-8ba6-4273-83a4-a71c6dfb3e85", // Pre-filled client ID
        }),
      })
      
      if (!configResponse.ok) {
        const data = await configResponse.json()
        throw new Error(data.error || "Failed to save Plex configuration")
      }
      
      // Mark onboarding as completed
      const onboardingResponse = await fetch("/api/user/onboarding-complete", {
        method: "POST",
      })
      
      if (!onboardingResponse.ok) {
        const data = await onboardingResponse.json()
        throw new Error(data.error || "Failed to complete onboarding")
      }
      
      console.log("Onboarding completed successfully, verifying and redirecting...")
      
      // Verify the onboarding was actually completed by checking the database
      const verifyResponse = await fetch("/api/user/onboarding-complete", {
        method: "GET",
      })
      
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json()
        if (verifyData.success && verifyData.onboardingCompleted) {
          console.log("Onboarding verified, redirecting to workspaces")
          // Set local state to trigger redirect
          setOnboardingCompleted(true)
          // Also do a direct redirect as backup
          setTimeout(() => {
            window.location.href = "/workspaces"
          }, 500)
        } else {
          throw new Error("Onboarding verification failed")
        }
      } else {
        throw new Error("Failed to verify onboarding completion")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete onboarding")
    } finally {
      setIsLoading(false)
    }
  }

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep
                      ? "bg-orange-600 text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {step}
                </div>
                {step < 4 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      step < currentStep ? "bg-orange-600" : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {currentStep === 1 && (
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome to Clipshare!
              </h1>
              <p className="text-lg text-gray-600 mb-6">
                Clipshare is an internal collaboration tool that allows teams to work together on video content from Plex libraries.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">What you can do:</h3>
                <ul className="text-blue-800 text-left space-y-1">
                  <li>• Create workspaces around specific episodes or movies</li>
                  <li>• Collaborate on bookmarking with public/private notes</li>
                  <li>• Share clips publicly with unguessable links</li>
                  <li>• Export clips for post-production</li>
                </ul>
              </div>
              <button
                onClick={nextStep}
                className="bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                Get Started
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Plex Server Configuration
              </h2>
              <p className="text-gray-600 mb-6">
                Configure your Plex server connection. This will be used to access your media libraries.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-blue-800 mb-2">How to get your Plex Server Token:</h3>
                <div className="text-sm text-blue-700">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Go to your Plex server web interface</li>
                    <li>Navigate to Settings → Network</li>
                    <li>Look for &quot;Plex Token&quot; or go to Settings → General</li>
                    <li>Copy the token (it&apos;s safe to use your main account token)</li>
                  </ol>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="serverUrl" className="block text-sm font-medium text-gray-700 mb-1">
                    Server URL
                  </label>
                  <input
                    type="url"
                    id="serverUrl"
                    value={wizardData.serverUrl}
                    onChange={(e) => handleInputChange("serverUrl", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                    placeholder="http://localhost:32400"
                  />
                </div>
                
                <div>
                  <label htmlFor="serverToken" className="block text-sm font-medium text-gray-700 mb-1">
                    Server Token
                  </label>
                  <input
                    type="password"
                    id="serverToken"
                    value={wizardData.serverToken}
                    onChange={(e) => handleInputChange("serverToken", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                    placeholder="Enter your Plex Server Token"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={prevStep}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  disabled={!wizardData.serverUrl || !wizardData.serverToken}
                  className="bg-orange-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Test Connection
              </h2>
              <p className="text-gray-600 mb-6">
                Let's test your Plex connection and fetch your available libraries.
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-yellow-900 mb-2">How to get Plex credentials:</h3>
                <ol className="text-yellow-800 text-sm space-y-1">
                  <li>1. Go to your Plex server web interface</li>
                  <li>2. Navigate to Settings → Network → Advanced</li>
                  <li>3. Enable &quot;Allow fallback to insecure connections&quot; if needed</li>
                  <li>4. Get your server token from the URL or use Plex Web Tools</li>
                </ol>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={prevStep}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Back
                </button>
                <button
                  onClick={testPlexConnection}
                  disabled={isLoading}
                  className="bg-orange-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Testing..." : "Test Connection"}
                </button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Ready to Collaborate!
              </h2>
              <p className="text-gray-600 mb-6">
                Great! Your Plex connection is working. Here are your available libraries:
              </p>
              
              {libraries.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-green-900 mb-2">Available Libraries:</h3>
                  <ul className="text-green-800 space-y-1">
                    {libraries.map((library) => (
                      <li key={library.key}>• {library.title} ({library.type})</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={prevStep}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Back
                </button>
                <button
                  onClick={completeOnboarding}
                  disabled={isLoading}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Completing..." : "Complete Setup"}
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-6 rounded-md bg-red-50 p-4">
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
    </div>
  )
}
