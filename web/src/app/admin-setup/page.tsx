"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface PlexConfig {
  clientId: string
  serverUrl: string
  serverToken: string
}

interface PlexLibrary {
  key: string
  title: string
  type: string
}

export default function AdminSetupPage() {
  const router = useRouter()
  const [config, setConfig] = useState<PlexConfig>({
    clientId: "800c9d71-8ba6-4273-83a4-a71c6dfb3e85",
    serverUrl: "",
    serverToken: "",
  })
  const [libraries, setLibraries] = useState<PlexLibrary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState(1) // 1: config, 2: test, 3: complete

  useEffect(() => {
    // Check if Plex is already configured
    fetch("/api/plex/status")
      .then(res => res.json())
      .then(data => {
        if (data.isConfigured) {
          router.push("/login")
        }
      })
      .catch(err => console.error("Error checking Plex status:", err))
  }, [router])

  const handleInputChange = (field: keyof PlexConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }))
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
        body: JSON.stringify(config),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to connect to Plex server")
      }
      
      setLibraries(data.libraries || [])
      setStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to Plex server")
    } finally {
      setIsLoading(false)
    }
  }

  const saveGlobalConfig = async () => {
    setIsLoading(true)
    setError("")
    
    try {
      const response = await fetch("/api/plex/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save configuration")
      }
      
      router.push("/login")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save configuration")
    } finally {
      setIsLoading(false)
    }
  }

  const nextStep = () => {
    if (step < 3) {
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Clipshare Admin Setup
          </h1>
          <p className="text-lg text-gray-600">
            Configure Plex server connection for your organization
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    stepNum <= step
                      ? "bg-orange-600 text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      stepNum < step ? "bg-orange-600" : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Plex Server Configuration
              </h2>
              <p className="text-gray-600 mb-6">
                Configure your Plex server connection. This will be used by all users in your organization.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-blue-800 mb-2">How to get your Plex Server Token:</h3>
                <div className="text-sm text-blue-700">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Go to your Plex server web interface</li>
                    <li>Navigate to Settings → Network</li>
                    <li>Look for "Plex Token" or go to Settings → General</li>
                    <li>Copy the token (it's safe to use your main account token)</li>
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
                    value={config.serverUrl}
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
                    value={config.serverToken}
                    onChange={(e) => handleInputChange("serverToken", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                    placeholder="Enter your Plex Server Token"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={nextStep}
                  disabled={!config.serverUrl || !config.serverToken}
                  className="bg-orange-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Test Connection
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Test Connection
              </h2>
              <p className="text-gray-600 mb-6">
                Let's test your Plex connection and verify access to your libraries.
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-yellow-900 mb-2">How to get Plex credentials:</h3>
                <ol className="text-yellow-800 text-sm space-y-1">
                  <li>1. Go to your Plex server web interface</li>
                  <li>2. Navigate to Settings → Network → Advanced</li>
                  <li>3. Enable "Allow fallback to insecure connections" if needed</li>
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

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Configuration Complete!
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

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">Next Steps:</h3>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• Save this configuration to enable Plex authentication for all users</li>
                  <li>• Users will be able to sign in with their Plex accounts</li>
                  <li>• You can update this configuration later in the admin settings</li>
                </ul>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={prevStep}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Back
                </button>
                <button
                  onClick={saveGlobalConfig}
                  disabled={isLoading}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Saving..." : "Save Configuration"}
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
