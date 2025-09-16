"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { 
  ArrowLeftIcon,
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon
} from "@heroicons/react/24/outline"
import OBSWebSocket from 'obs-websocket-js'

interface Workspace {
  id: string
  title: string
  description: string | null
  contentType: string
  contentTitle: string
  contentPoster: string | null
  contentDuration: number
  processingStatus: string
  processingProgress: number
  createdAt: string
  updatedAt: string
  producer: {
    id: string
    name: string | null
    plexUsername: string | null
    plexAvatarUrl: string | null
  }
  memberships: Array<{
    id: string
    role: string
    user: {
      id: string
      name: string | null
      plexUsername: string | null
      plexAvatarUrl: string | null
    }
  }>
  bookmarks: Array<{
    id: string
    label: string | null
    publicNotes: string | null
    privateNotes: string | null
    startMs: number
    endMs: number
    lockedById: string | null
    lockedAt: string | null
    createdAt: string
    updatedAt: string
    createdBy: {
      id: string
      name: string | null
      plexUsername: string | null
      plexAvatarUrl: string | null
    }
  }>
}

interface OBSConnection {
  host: string
  port: number
  password: string
}

export default function VTRControlPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const workspaceId = params.id as string

  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // OBS WebSocket connection
  const [obs, setObs] = useState<OBSWebSocket | null>(null)
  const [obsConnected, setObsConnected] = useState(false)
  const [obsConnecting, setObsConnecting] = useState(false)
  const [obsError, setObsError] = useState<string | null>(null)
  
  // Connection settings
  const [connectionSettings, setConnectionSettings] = useState<OBSConnection>({
    host: '127.0.0.1',
    port: 4455,
    password: ''
  })
  
  // VTR state
  const [currentClip, setCurrentClip] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(100)
  const [muted, setMuted] = useState(false)
  const [looping, setLooping] = useState(false)

  // Load workspace data
  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const response = await fetch(`/api/workspaces?id=${workspaceId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch workspace')
        }
        const data = await response.json()
        if (!data.success || !data.workspace) {
          throw new Error('Invalid workspace data')
        }
        setWorkspace(data.workspace)
      } catch (err) {
        console.error('Error fetching workspace:', err)
        setError(err instanceof Error ? err.message : 'Failed to load workspace')
      } finally {
        setLoading(false)
      }
    }

    if (workspaceId) {
      fetchWorkspace()
    }
  }, [workspaceId])

  // Connect to OBS WebSocket
  const connectToOBS = async () => {
    if (!workspace) {
      console.error('No workspace available for OBS connection')
      return
    }

    console.log('Starting OBS connection...', connectionSettings)
    setObsConnecting(true)
    setObsError(null)

    try {
      console.log('Creating OBS WebSocket client...')
      const obsClient = new OBSWebSocket()
      
      console.log('Attempting to connect to:', `ws://${connectionSettings.host}:${connectionSettings.port}`)
      
      // Add connection timeout
      const connectionPromise = obsClient.connect(
        `ws://${connectionSettings.host}:${connectionSettings.port}`, 
        connectionSettings.password
      )
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout - OBS WebSocket server may not be running')), 10000)
      })
      
      console.log('Waiting for connection...')
      await Promise.race([connectionPromise, timeoutPromise])
      console.log('Connection established!')
      
      // Set up event listeners
      obsClient.on('ConnectionClosed', (data) => {
        console.log('OBS connection closed:', data)
        setObsConnected(false)
        setObsError('Connection lost')
      })

      obsClient.on('MediaInputPlaybackStarted', (data) => {
        console.log('Media playback started:', data)
        setIsPlaying(true)
        setCurrentClip(data.inputName)
      })

      obsClient.on('MediaInputPlaybackEnded', (data) => {
        console.log('Media playback ended:', data)
        setIsPlaying(false)
        setCurrentClip(null)
      })

      // Test the connection by getting OBS version
      try {
        console.log('Testing connection with GetVersion...')
        const version = await obsClient.call('GetVersion')
        console.log('Connected to OBS:', version)
      } catch (versionErr) {
        console.warn('Could not get OBS version:', versionErr)
      }

      // Create or find the VTR player source
      console.log('Setting up VTR player source...')
      await ensureVTRPlayerSource(obsClient)
      console.log('VTR player source setup complete')
      
      setObs(obsClient)
      setObsConnected(true)
      console.log('OBS connection successful!')
      
      // Store connection settings in localStorage
      localStorage.setItem('obs-connection', JSON.stringify(connectionSettings))
      
    } catch (err) {
      console.error('OBS connection error:', err)
      console.error('Error details:', {
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
        cause: err?.cause
      })
      
      // Provide more specific error messages
      let errorMessage = 'Failed to connect to OBS'
      if (err instanceof Error) {
        if (err.message.includes('timeout')) {
          errorMessage = 'Connection timeout - Make sure OBS Studio is running and WebSocket server is enabled'
        } else if (err.message.includes('ECONNREFUSED')) {
          errorMessage = 'Connection refused - OBS WebSocket server is not running'
        } else if (err.message.includes('WebSocket')) {
          errorMessage = 'WebSocket error - Check OBS WebSocket settings'
        } else if (err.message.includes('Authentication')) {
          errorMessage = 'Authentication failed - Check your password'
        } else {
          errorMessage = `Connection error: ${err.message}`
        }
      } else {
        errorMessage = `Unknown error: ${String(err)}`
      }
      
      setObsError(errorMessage)
    } finally {
      setObsConnecting(false)
    }
  }

  // Disconnect from OBS
  const disconnectFromOBS = async () => {
    if (obs) {
      try {
        await obs.disconnect()
      } catch (err) {
        console.error('Error disconnecting:', err)
      }
    }
    setObs(null)
    setObsConnected(false)
    setIsPlaying(false)
    setCurrentClip(null)
  }

  // Ensure VTR player source exists and is added to current scene
  const ensureVTRPlayerSource = async (obsClient: OBSWebSocket) => {
    const sourceName = `Clipshare_VTR_Player_${workspaceId}`
    
    try {
      console.log(`Checking if VTR player source exists: ${sourceName}`)
      // Try to get existing source
      await obsClient.call('GetInputSettings', { inputName: sourceName })
      console.log(`VTR player source already exists: ${sourceName}`)
    } catch (sourceErr) {
      console.log(`Source doesn't exist, creating: ${sourceName}`)
      // Source doesn't exist, create it
      try {
        // Get current scene first
        console.log('Getting current program scene...')
        const currentScene = await obsClient.call('GetCurrentProgramScene')
        const sceneName = currentScene.currentProgramSceneName
        console.log(`Current scene: ${sceneName}`)
        
        console.log('Creating VTR player source...')
        await obsClient.call('CreateInput', {
          inputName: sourceName,
          inputKind: 'ffmpeg_source',
          sceneName: sceneName,
          inputSettings: {
            is_local_file: false,
            local_file: '',
            looping: looping,
            restart_on_activate: false,
            close_when_inactive: false,
            hw_decode: true
          }
        })
        console.log(`Created VTR player source: ${sourceName} in scene: ${sceneName}`)
      } catch (err) {
        console.error('Error creating VTR player source:', err)
        console.error('CreateInput error details:', {
          name: err?.name,
          message: err?.message,
          stack: err?.stack
        })
        throw new Error(`Failed to create VTR player source: ${err?.message || 'Unknown error'}`)
      }
    }
    
    // Ensure the source is visible in the current scene
    try {
      console.log('Ensuring source is in current scene...')
      const currentScene = await obsClient.call('GetCurrentProgramScene')
      const sceneName = currentScene.currentProgramSceneName
      
      // Check if source is already in the scene
      console.log('Getting scene items...')
      const sceneItems = await obsClient.call('GetSceneItemList', { sceneName })
      const sourceInScene = sceneItems.sceneItems.find((item: any) => item.sourceName === sourceName)
      
      if (!sourceInScene) {
        console.log('Adding source to current scene...')
        // Add source to current scene
        await obsClient.call('CreateSceneItem', {
          sceneName: sceneName,
          sourceName: sourceName,
          sceneItemEnabled: true
        })
        console.log(`Added VTR player source to current scene: ${sceneName}`)
      } else {
        console.log(`VTR player source already in current scene: ${sceneName}`)
      }
    } catch (err) {
      console.error('Error adding source to scene:', err)
      console.error('Scene addition error details:', {
        name: err?.name,
        message: err?.message,
        stack: err?.stack
      })
      // Don't throw here - source creation was successful, scene addition is optional
    }
  }

  // Generate stream token for a bookmark
  const generateStreamToken = async (bookmarkId: string): Promise<string> => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/clips/${bookmarkId}/token`)
      if (!response.ok) {
        throw new Error('Failed to generate token')
      }
      const data = await response.json()
      return data.token
    } catch (err) {
      console.error('Error generating token:', err)
      throw err
    }
  }

  // Play a specific clip
  const playClip = async (bookmark: Workspace['bookmarks'][0]) => {
    if (!obs || !workspace) return

    try {
      const sourceName = `Clipshare_VTR_Player_${workspaceId}`
      
      // Generate token for this bookmark
      const token = await generateStreamToken(bookmark.id)
      const clipUrl = `${window.location.origin}/api/workspaces/${workspaceId}/clips/${bookmark.id}/stream?token=${token}`
      
      // Update the media source to play the clip
      await obs.call('SetInputSettings', {
        inputName: sourceName,
        inputSettings: {
          is_local_file: false,
          local_file: '',
          input: clipUrl,
          looping: looping,
          restart_on_activate: false,
          close_when_inactive: false,
          hw_decode: true
        }
      })

      // Trigger the media input to restart and play
      await obs.call('TriggerMediaInputAction', { 
        inputName: sourceName,
        mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART'
      })
      
      setCurrentClip(bookmark.id)
      setIsPlaying(true)
      
    } catch (err) {
      console.error('Error playing clip:', err)
      setObsError('Failed to play clip')
    }
  }

  // Stop current clip
  const stopClip = async () => {
    if (!obs) return

    try {
      const sourceName = `Clipshare_VTR_Player_${workspaceId}`
      await obs.call('TriggerMediaInputAction', { 
        inputName: sourceName,
        mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP'
      })
      
      setIsPlaying(false)
      setCurrentClip(null)
    } catch (err) {
      console.error('Error stopping clip:', err)
      setObsError('Failed to stop clip')
    }
  }

  // Set volume
  const setVolumeLevel = async (newVolume: number) => {
    if (!obs) return

    try {
      const sourceName = `Clipshare_VTR_Player_${workspaceId}`
      await obs.call('SetInputVolume', {
        inputName: sourceName,
        inputVolumeMul: newVolume / 100
      })
      setVolume(newVolume)
    } catch (err) {
      console.error('Error setting volume:', err)
    }
  }

  // Toggle mute
  const toggleMute = async () => {
    if (!obs) return

    try {
      const sourceName = `Clipshare_VTR_Player_${workspaceId}`
      await obs.call('ToggleInputMute', { inputName: sourceName })
      setMuted(!muted)
    } catch (err) {
      console.error('Error toggling mute:', err)
    }
  }

  // Toggle looping
  const toggleLooping = async () => {
    if (!obs) return

    try {
      const sourceName = `Clipshare_VTR_Player_${workspaceId}`
      const newLooping = !looping
      
      await obs.call('SetInputSettings', {
        inputName: sourceName,
        inputSettings: {
          looping: newLooping
        }
      })
      
      setLooping(newLooping)
      console.log(`Looping ${newLooping ? 'enabled' : 'disabled'}`)
    } catch (err) {
      console.error('Error toggling looping:', err)
    }
  }

  // Add source to current scene
  const addSourceToScene = async () => {
    if (!obs) return

    try {
      const sourceName = `Clipshare_VTR_Player_${workspaceId}`
      const currentScene = await obs.call('GetCurrentProgramScene')
      const sceneName = currentScene.currentProgramSceneName
      
      await obs.call('CreateSceneItem', {
        sceneName: sceneName,
        sourceName: sourceName,
        sceneItemEnabled: true
      })
      
      console.log(`Added VTR player source to current scene: ${sceneName}`)
    } catch (err) {
      console.error('Error adding source to scene:', err)
      setObsError('Failed to add source to scene')
    }
  }

  // Load saved connection settings
  useEffect(() => {
    const saved = localStorage.getItem('obs-connection')
    if (saved) {
      try {
        setConnectionSettings(JSON.parse(saved))
      } catch (err) {
        console.error('Error loading saved connection settings:', err)
      }
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (!obsConnected || !workspace) return

      // F1-F12 for clips
      if (e.key.startsWith('F') && e.key.length <= 3) {
        const keyNum = parseInt(e.key.substring(1))
        if (keyNum >= 1 && keyNum <= workspace.bookmarks.length) {
          e.preventDefault()
          const bookmark = workspace.bookmarks[keyNum - 1]
          if (bookmark) {
            playClip(bookmark)
          }
        }
      }

      // Space bar to stop
      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault()
        stopClip()
      }
    }

    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [obsConnected, workspace])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ClockIcon className="h-8 w-8 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading VTR Control...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/login')
    return null
  }

  if (error || !workspace) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">{error || 'Workspace not found'}</p>
          <button
            onClick={() => router.push('/workspaces')}
            className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Back to Workspaces
          </button>
        </div>
      </div>
    )
  }

  const isProducer = workspace.producer.id === session?.user?.id

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push(`/workspace/${workspaceId}`)}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  VTR Control - {workspace.title}
                </h1>
                <p className="text-sm text-gray-500">
                  {workspace.bookmarks.length} clips available
                </p>
              </div>
            </div>

            {/* OBS Connection Status */}
            <div className="flex items-center space-x-4">
              {obsConnected ? (
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">OBS Connected</span>
                  <button
                    onClick={disconnectFromOBS}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                  <span className="text-sm text-red-600 font-medium">OBS Disconnected</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* OBS Connection Panel */}
        {!obsConnected && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Connect to OBS Studio</h2>
            
            {obsError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{obsError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Host
                </label>
                <input
                  type="text"
                  value={connectionSettings.host}
                  onChange={(e) => setConnectionSettings({ ...connectionSettings, host: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port
                </label>
                <input
                  type="number"
                  value={connectionSettings.port}
                  onChange={(e) => setConnectionSettings({ ...connectionSettings, port: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={connectionSettings.password}
                  onChange={(e) => setConnectionSettings({ ...connectionSettings, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <button
              onClick={connectToOBS}
              disabled={obsConnecting}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {obsConnecting ? (
                <>
                  <ClockIcon className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect to OBS'
              )}
            </button>

            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Prerequisites:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>OBS Studio 28+ running</li>
                <li>WebSocket Server enabled (Tools → WebSocket Server Settings)</li>
                <li>Default port: 4455, or set your custom port</li>
                <li>Password: Set in OBS WebSocket settings (recommended)</li>
              </ul>
              
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Quick Setup:</strong> In OBS Studio, go to Tools → WebSocket Server Settings, 
                  enable the server, set a password, and click OK. Then try connecting again.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VTR Control Panel */}
        {obsConnected && (
          <div className="space-y-8">
            {/* Current Status */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h2>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {isPlaying ? (
                      <>
                        <PlayIcon className="h-4 w-4 inline mr-1 text-green-600" />
                        Playing: {workspace.bookmarks.find(b => b.id === currentClip)?.label || 'Unknown'}
                      </>
                    ) : (
                      <>
                        <StopIcon className="h-4 w-4 inline mr-1 text-gray-400" />
                        Stopped
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Volume Control */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={toggleMute}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      {muted ? (
                        <SpeakerXMarkIcon className="h-5 w-5" />
                      ) : (
                        <SpeakerWaveIcon className="h-5 w-5" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolumeLevel(parseInt(e.target.value))}
                      className="w-20"
                    />
                    <span className="text-sm text-gray-600 w-8">{volume}%</span>
                  </div>

                  {/* Loop Control */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={toggleLooping}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        looping 
                          ? 'bg-orange-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <ArrowPathIcon className="h-4 w-4 mr-1 inline" />
                      Loop
                    </button>
                  </div>

                  {/* Stop Button */}
                  <button
                    onClick={stopClip}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                  >
                    <StopIcon className="h-4 w-4 mr-2" />
                    Stop
                  </button>

                  {/* Add to Scene Button */}
                  <button
                    onClick={addSourceToScene}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    Add to Scene
                  </button>
                </div>
              </div>
            </div>

            {/* Clip Controls */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Clip Controls</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {workspace.bookmarks.map((bookmark, index) => {
                  const duration = ((bookmark.endMs - bookmark.startMs) / 1000).toFixed(1)
                  const creator = bookmark.createdBy.plexUsername || bookmark.createdBy.name || 'Unknown'
                  const isCurrentClip = currentClip === bookmark.id
                  
                  return (
                    <button
                      key={bookmark.id}
                      onClick={() => playClip(bookmark)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isCurrentClip && isPlaying
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-left">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {bookmark.label || `Clip ${index + 1}`}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            F{index + 1}
                          </span>
                        </div>
                        
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>Duration: {duration}s</p>
                          <p>Creator: {creator}</p>
                        </div>

                        {isCurrentClip && isPlaying && (
                          <div className="mt-2 flex items-center text-orange-600">
                            <PlayIcon className="h-3 w-3 mr-1" />
                            <span className="text-xs font-medium">Playing</span>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Keyboard Shortcuts</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Clip Controls</h3>
                  <ul className="space-y-1 text-gray-600">
                    {workspace.bookmarks.slice(0, 12).map((bookmark, index) => (
                      <li key={bookmark.id}>
                        <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">F{index + 1}</kbd>
                        {' '}{bookmark.label || `Clip ${index + 1}`}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">General Controls</h3>
                  <ul className="space-y-1 text-gray-600">
                    <li>
                      <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Space</kbd>
                      {' '}Stop current clip
                    </li>
                    <li>
                      <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Click</kbd>
                      {' '}Play any clip
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
