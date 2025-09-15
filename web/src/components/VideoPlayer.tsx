"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { 
  PlayIcon, 
  PauseIcon, 
  BookmarkIcon,
  PlusIcon,
  XMarkIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MinusIcon,
  MagnifyingGlassIcon,
  MagnifyingGlassMinusIcon
} from "@heroicons/react/24/outline"
// Dynamic import for dashjs to avoid SSR issues
const loadDashjs = () => {
  if (typeof window !== 'undefined') {
    return import('dashjs')
  }
  return Promise.resolve(null)
}
import NLETimeline from './NLETimeline'

interface VideoPlayerProps {
  workspaceId: string
  plexKey: string
  plexServerId: string
  contentDuration: number
  onBookmarkCreate: (bookmark: {
    label?: string
    publicNotes?: string
    privateNotes?: string
    startMs: number
    endMs: number
  }) => void
  bookmarks: Array<{
    id: string
    label: string | null
    publicNotes: string | null
    privateNotes: string | null
    startMs: number
    endMs: number
    lockedById: string | null
    lockedAt: string | null
    createdBy: {
      id: string
      plexUsername: string | null
    }
    lockedBy: {
      id: string
      plexUsername: string | null
    } | null
  }>
  currentUserId: string
  useNLETimeline?: boolean
  showTimelineBelow?: boolean
}

interface BookmarkCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    label?: string
    publicNotes?: string
    privateNotes?: string
    startMs?: number
    endMs?: number
  }) => void
  startTime: number
  endTime: number
  onTimeAdjust?: (type: 'start' | 'end', direction: 'plus' | 'minus', frames: number) => void
  onJumpToTime?: (timeMs: number) => void
}

function BookmarkCreationModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  startTime, 
  endTime,
  onTimeAdjust,
  onJumpToTime
}: BookmarkCreationModalProps) {
  const [label, setLabel] = useState("")
  const [publicNotes, setPublicNotes] = useState("")
  const [privateNotes, setPrivateNotes] = useState("")
  const [currentStartTime, setCurrentStartTime] = useState(startTime)
  const [currentEndTime, setCurrentEndTime] = useState(endTime)

  // Update times when props change
  useEffect(() => {
    setCurrentStartTime(startTime)
    setCurrentEndTime(endTime)
  }, [startTime, endTime])

  const formatTimecode = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleTimeAdjust = (type: 'start' | 'end', direction: 'plus' | 'minus', frames: number) => {
    const adjustment = direction === 'plus' ? frames : -frames
    const frameMs = (1000 / 30) * adjustment // Assuming 30fps
    
    if (type === 'start') {
      const newStartTime = Math.max(0, currentStartTime + frameMs)
      setCurrentStartTime(newStartTime)
      onTimeAdjust?.(type, direction, frames)
    } else {
      const newEndTime = currentEndTime + frameMs
      setCurrentEndTime(newEndTime)
      onTimeAdjust?.(type, direction, frames)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      label: label.trim() || undefined,
      publicNotes: publicNotes.trim() || undefined,
      privateNotes: privateNotes.trim() || undefined,
      startMs: currentStartTime,
      endMs: currentEndTime,
    })
    setLabel("")
    setPublicNotes("")
    setPrivateNotes("")
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Create Bookmark</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600 mb-2">
            <ClockIcon className="h-4 w-4 inline mr-2" />
            Time Range
          </div>
          
          {/* In Point Controls */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">In Point</label>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-600">{formatTimecode(currentStartTime)}</span>
                {onJumpToTime && (
                  <button
                    type="button"
                    onClick={() => onJumpToTime(currentStartTime)}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded"
                    title="Jump to in point"
                  >
                    Jump
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => handleTimeAdjust('start', 'minus', 10)}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                title="-10 frames"
              >
                -10
              </button>
              <button
                type="button"
                onClick={() => handleTimeAdjust('start', 'minus', 1)}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                title="-1 frame"
              >
                -1
              </button>
              <button
                type="button"
                onClick={() => handleTimeAdjust('start', 'plus', 1)}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                title="+1 frame"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => handleTimeAdjust('start', 'plus', 10)}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                title="+10 frames"
              >
                +10
              </button>
            </div>
          </div>

          {/* Out Point Controls */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">Out Point</label>
              <span className="text-xs text-gray-600">{formatTimecode(currentEndTime)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => handleTimeAdjust('end', 'minus', 10)}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                title="-10 frames"
              >
                -10
              </button>
              <button
                type="button"
                onClick={() => handleTimeAdjust('end', 'minus', 1)}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                title="-1 frame"
              >
                -1
              </button>
              <button
                type="button"
                onClick={() => handleTimeAdjust('end', 'plus', 1)}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                title="+1 frame"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => handleTimeAdjust('end', 'plus', 10)}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                title="+10 frames"
              >
                +10
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="label" className="block text-sm font-medium text-gray-700 mb-1">
              Label (optional)
            </label>
            <input
              type="text"
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Important Scene"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div>
            <label htmlFor="publicNotes" className="block text-sm font-medium text-gray-700 mb-1">
              Public Notes (visible to all collaborators)
            </label>
            <textarea
              id="publicNotes"
              value={publicNotes}
              onChange={(e) => setPublicNotes(e.target.value)}
              placeholder="Notes visible to all collaborators..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div>
            <label htmlFor="privateNotes" className="block text-sm font-medium text-gray-700 mb-1">
              Private Notes (only visible to you)
            </label>
            <textarea
              id="privateNotes"
              value={privateNotes}
              onChange={(e) => setPrivateNotes(e.target.value)}
              placeholder="Your private notes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Create Bookmark
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function VideoPlayer({
  workspaceId,
  plexKey,
  plexServerId,
  contentDuration,
  onBookmarkCreate,
  bookmarks,
  currentUserId,
  useNLETimeline = false,
  showTimelineBelow = false
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const dashRef = useRef<any>(null)
  const consoleFilterRef = useRef<((...args: any[]) => void) | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showBookmarkModal, setShowBookmarkModal] = useState(false)
  const [bookmarkStartTime, setBookmarkStartTime] = useState(0)
  const [bookmarkEndTime, setBookmarkEndTime] = useState(0)
  const [isSelectingRange, setIsSelectingRange] = useState(false)
  const [rangeStart, setRangeStart] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timelineZoom, setTimelineZoom] = useState(1)
  const [showTimelineTooltip, setShowTimelineTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState(0)
  const [tooltipTime, setTooltipTime] = useState(0)

  const formatTimecode = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = parseFloat(e.target.value)
      videoRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newVolume = parseFloat(e.target.value)
      videoRef.current.volume = newVolume
      setVolume(newVolume)
    }
  }

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (!isFullscreen) {
        videoRef.current.requestFullscreen()
      } else {
        document.exitFullscreen()
      }
    }
  }

  const startBookmarkSelection = () => {
    if (videoRef.current) {
      setRangeStart(videoRef.current.currentTime)
      setIsSelectingRange(true)
    }
  }

  const endBookmarkSelection = () => {
    if (videoRef.current && isSelectingRange) {
      const endTime = videoRef.current.currentTime
      const startTime = rangeStart
      
      if (startTime < endTime) {
        setBookmarkStartTime(startTime * 1000)
        setBookmarkEndTime(endTime * 1000)
        setShowBookmarkModal(true)
      }
      setIsSelectingRange(false)
    }
  }

  const createBookmarkAtCurrentTime = () => {
    if (videoRef.current) {
      const currentTimeMs = videoRef.current.currentTime * 1000
      // Set a default 5-second range around current time
      const defaultDuration = 5000 // 5 seconds
      const startTime = Math.max(0, currentTimeMs - defaultDuration / 2)
      const endTime = Math.min(contentDuration, currentTimeMs + defaultDuration / 2)
      
      setBookmarkStartTime(startTime)
      setBookmarkEndTime(endTime)
      setShowBookmarkModal(true)
    }
  }

  const handleTimelineMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const time = percentage * duration
    setTooltipPosition(x)
    setTooltipTime(time)
    setShowTimelineTooltip(true)
  }

  const handleTimelineMouseLeave = () => {
    setShowTimelineTooltip(false)
  }

  const handleTimeAdjust = (type: 'start' | 'end', direction: 'plus' | 'minus', frames: number) => {
    if (videoRef.current) {
      const adjustment = direction === 'plus' ? frames : -frames
      const frameMs = (1000 / 30) * adjustment // Assuming 30fps
      
      if (type === 'start') {
        const newStartTime = Math.max(0, bookmarkStartTime + frameMs)
        setBookmarkStartTime(newStartTime)
      } else {
        const newEndTime = bookmarkEndTime + frameMs
        setBookmarkEndTime(newEndTime)
      }
    }
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target !== videoRef.current) return

    switch (e.key) {
      case ' ':
        e.preventDefault()
        handlePlayPause()
        break
      case 'i':
      case 'I':
        e.preventDefault()
        if (!isSelectingRange) {
          startBookmarkSelection()
        }
        break
      case 'o':
      case 'O':
        e.preventDefault()
        if (isSelectingRange) {
          endBookmarkSelection()
        }
        break
      case 'Escape':
        if (isSelectingRange) {
          setIsSelectingRange(false)
        }
        break
      case 'ArrowLeft':
        e.preventDefault()
        if (videoRef.current) {
          const newTime = Math.max(0, videoRef.current.currentTime - (e.shiftKey ? 10 : 1))
          videoRef.current.currentTime = newTime
        }
        break
      case 'ArrowRight':
        e.preventDefault()
        if (videoRef.current) {
          const newTime = Math.min(duration, videoRef.current.currentTime + (e.shiftKey ? 10 : 1))
          videoRef.current.currentTime = newTime
        }
        break
    }
  }, [isSelectingRange, rangeStart, duration])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    setIsLoading(true)
    setError(null)

    // Store original console functions to restore later
    const originalConsoleError = console.error
    const originalConsoleWarn = console.warn
    
    // Clean up existing DASH instance
    if (dashRef.current) {
      try {
        // Properly teardown the stream before destroying
        dashRef.current.reset()
        dashRef.current.destroy()
      } catch (error) {
        console.warn("Error during DASH cleanup:", error)
      } finally {
        dashRef.current = null
      }
    }

    // Use DASH streaming for audio compatibility (like Plex Web)
    const setupDASH = async () => {
      try {
        console.log("Setting up DASH for:", { plexKey, plexServerId })

        // First, get the DASH URL from our API
        const response = await fetch(`/api/plex/hls?key=${plexKey}&serverId=${plexServerId}`)
        if (!response.ok) {
          const errorText = await response.text()
          console.error("Failed to get DASH URL:", response.status, errorText)
          throw new Error(`Failed to get DASH URL: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        console.log("DASH API response:", data)

        if (!data.dashUrl) {
          throw new Error("No DASH URL returned from API")
        }

        const dashSrc = data.dashUrl
        console.log("Got DASH URL:", dashSrc)

        // Test if the DASH URL is accessible (with timeout)
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

          const testResponse = await fetch(dashSrc, {
            method: 'HEAD',
            signal: controller.signal
          })

          clearTimeout(timeoutId)
          console.log("DASH URL accessibility test:", testResponse.status, testResponse.statusText)

          if (!testResponse.ok) {
            console.warn(`DASH URL returned ${testResponse.status}, but continuing anyway...`)
            // Don't throw here - let dash.js handle the error
          }
        } catch (testError) {
          console.warn("DASH URL test failed, but continuing anyway:", testError)
          // Don't throw here - let dash.js handle the error
        }
        
        // Load dashjs dynamically
        const dashjs = await loadDashjs()
        if (dashjs && dashjs.supportsMediaSource()) {
          console.log("Using dash.js for playback")
          
          // Suppress SourceBuffer error messages globally
          const consoleFilter = (...args: any[]) => {
            const message = args.join(' ')
            if (message.includes('SourceBuffer has been removed') || 
                message.includes('getAllBufferRanges exception') ||
                message.includes('[SourceBufferSink][audio]') ||
                message.includes('Failed to read the \'buffered\' property')) {
              // Suppress these specific SourceBuffer cleanup messages
              return
            }
            originalConsoleError.apply(console, args)
          }
          
          consoleFilterRef.current = consoleFilter
          console.error = consoleFilter
          
          // Also suppress console.warn for these messages
          const originalConsoleWarn = console.warn
          console.warn = (...args: any[]) => {
            const message = args.join(' ')
            if (message.includes('SourceBuffer has been removed') || 
                message.includes('getAllBufferRanges exception') ||
                message.includes('[SourceBufferSink][audio]')) {
              return
            }
            originalConsoleWarn.apply(console, args)
          }
          
          const player = dashjs.MediaPlayer().create()
          
          // Configure dash.js to reduce SourceBuffer errors
          player.updateSettings({
            debug: {
              logLevel: dashjs.Debug.LOG_LEVEL_ERROR // Only show actual errors
            },
            streaming: {
              abr: {
                autoSwitchBitrate: {
                  video: true,
                  audio: true
                }
              },
              buffer: {
                bufferTimeAtTopQuality: 30,
                fastSwitchEnabled: true,
                reuseExistingSourceBuffers: true // Reuse buffers to reduce cleanup issues
              }
            }
          })
          
          dashRef.current = player
          
          player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
            console.log("DASH stream initialized")
            setIsLoading(false)
          })
          
          player.on(dashjs.MediaPlayer.events.ERROR, (event: any) => {
            // Filter out SourceBuffer errors that are common and non-fatal
            if (event.error && event.error.message && 
                event.error.message.includes('SourceBuffer has been removed')) {
              console.warn("SourceBuffer cleanup warning (non-fatal):", event.error.message)
              return // Don't treat this as a fatal error
            }
            
            console.error("DASH error event:", event)
            
            if (event.error && event.error.code) {
              console.error("DASH error details:", {
                code: event.error.code,
                message: event.error.message,
                data: event.error.data
              })
              
              setError(`Video playback failed: ${event.error.message || 'Unknown error'}. Please try again.`)
              setIsLoading(false)
            } else {
              console.error("DASH error with no details - possible connection issue or authentication problem")
              setError("Failed to access video stream. This may be due to authentication issues or server permissions. Please check your Plex configuration.")
              setIsLoading(false)
            }
          })
          
          // Add additional event handlers for better cleanup
          player.on(dashjs.MediaPlayer.events.STREAM_TEARDOWN_COMPLETE, () => {
            console.log("DASH stream teardown complete")
          })
          
          player.initialize(video, dashSrc, false)
        } else {
          // Fallback to direct proxy (may not have audio)
          console.log("DASH not supported, falling back to direct proxy")
          const fallbackSrc = `/api/plex/proxy?key=${plexKey}&serverId=${plexServerId}`
          video.src = fallbackSrc
          setIsLoading(false)
        }
      } catch (error) {
        console.error("Failed to setup DASH:", error)
        setError("Failed to load video. Please try again.")
        setIsLoading(false)
      }
    }

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleDurationChange = () => setDuration(video.duration)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleVolumeChange = () => setVolume(video.volume)
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
    const handleLoadStart = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)
    const handleError = (e: Event) => {
      console.error("Video error:", e)
      setError("Failed to load video. Please check your connection and try again.")
      setIsLoading(false)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('durationchange', handleDurationChange)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('volumechange', handleVolumeChange)
    video.addEventListener('loadstart', handleLoadStart)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('error', handleError)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('keydown', handleKeyDown)

        setupDASH()

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('durationchange', handleDurationChange)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('volumechange', handleVolumeChange)
      video.removeEventListener('loadstart', handleLoadStart)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('error', handleError)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('keydown', handleKeyDown)
      
      if (dashRef.current) {
        try {
          // Properly teardown the stream before destroying
          dashRef.current.reset()
          dashRef.current.destroy()
        } catch (error) {
          console.warn("Error during DASH cleanup:", error)
        } finally {
          dashRef.current = null
          // Restore original console functions
          if (consoleFilterRef.current) {
            console.error = originalConsoleError
            console.warn = originalConsoleWarn
            consoleFilterRef.current = null
          }
        }
      }
    }
  }, [handleKeyDown, plexKey, plexServerId])

  const handleBookmarkSubmit = (data: {
    label?: string
    publicNotes?: string
    privateNotes?: string
  }) => {
    onBookmarkCreate({
      ...data,
      startMs: bookmarkStartTime,
      endMs: bookmarkEndTime,
    })
  }

  return (
    <div className="relative">
      {/* Video Container */}
      <div className="bg-black rounded-lg overflow-hidden">
        {/* Video Element */}
        <video
          ref={videoRef}
          className="w-full h-full"
          controls={false}
          preload="metadata"
          crossOrigin="anonymous"
        >
          Your browser does not support the video tag.
        </video>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
            <div>Loading video...</div>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
          <div className="text-white text-center p-4">
            <div className="text-red-400 mb-2">⚠️</div>
            <div className="mb-4">{error}</div>
            <button
              onClick={() => {
                setError(null)
                setIsLoading(true)
                // Trigger a reload by updating the key
                window.location.reload()
              }}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Retry
            </button>
          </div>
        </div>
      )}

        {/* Custom Controls Overlay */}
        {!isLoading && !error && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
        {/* Timeline */}
        {useNLETimeline && !showTimelineBelow ? (
          <NLETimeline
            duration={duration}
            currentTime={currentTime}
            onSeek={(time) => {
              if (videoRef.current) {
                videoRef.current.currentTime = time
              }
            }}
            bookmarks={bookmarks}
            onBookmarkCreate={(startMs, endMs) => {
              setBookmarkStartTime(startMs)
              setBookmarkEndTime(endMs)
              setShowBookmarkModal(true)
            }}
            onBookmarkUpdate={(bookmarkId, startMs, endMs) => {
              // Handle bookmark updates
              console.log('Bookmark update:', bookmarkId, startMs, endMs)
            }}
            onBookmarkDelete={(bookmarkId) => {
              // Handle bookmark deletion
              console.log('Bookmark delete:', bookmarkId)
            }}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onStep={(direction, frames) => {
              if (videoRef.current) {
                const frameTime = frames / 30 // Assuming 30fps
                const newTime = direction === 'forward' 
                  ? Math.min(duration, currentTime + frameTime)
                  : Math.max(0, currentTime - frameTime)
                videoRef.current.currentTime = newTime
              }
            }}
            videoElement={videoRef.current}
            frameRate={30}
          />
        ) : !showTimelineBelow ? (
          <div className="mb-4">
            <div className="relative">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                onMouseMove={handleTimelineMouseMove}
                onMouseLeave={handleTimelineMouseLeave}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #f97316 0%, #f97316 ${(currentTime / (duration || 1)) * 100}%, #4b5563 ${(currentTime / (duration || 1)) * 100}%, #4b5563 100%)`
                }}
              />
              
              {/* Timeline Tooltip */}
              {showTimelineTooltip && (
                <div
                  className="absolute bottom-6 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded pointer-events-none z-10"
                  style={{ left: `${tooltipPosition - 20}px` }}
                >
                  {formatTimecode(tooltipTime * 1000)}
                </div>
              )}
              
              {/* Bookmark Markers */}
              {bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className={`absolute top-0 h-2 rounded-sm ${
                    bookmark.lockedById ? 'bg-red-500' : 'bg-blue-500'
                  } opacity-70 cursor-pointer hover:opacity-90`}
                  style={{
                    left: `${(bookmark.startMs / 1000 / (duration || 1)) * 100}%`,
                    width: `${((bookmark.endMs - bookmark.startMs) / 1000 / (duration || 1)) * 100}%`,
                  }}
                  title={`${bookmark.label || 'Untitled'} - ${formatTimecode(bookmark.startMs)} → ${formatTimecode(bookmark.endMs)}${bookmark.lockedById ? ' (Locked)' : ''}`}
                />
              ))}
              
              {/* Selection Range Highlight */}
              {isSelectingRange && (
                <div
                  className="absolute top-0 h-2 bg-orange-400 opacity-50 rounded-sm"
                  style={{
                    left: `${(rangeStart / (duration || 1)) * 100}%`,
                    width: `${((currentTime - rangeStart) / (duration || 1)) * 100}%`,
                  }}
                />
              )}
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setTimelineZoom(Math.max(0.5, timelineZoom - 0.25))}
                  className="text-white hover:text-orange-400 transition-colors"
                  title="Zoom out timeline"
                >
                  <MagnifyingGlassMinusIcon className="h-4 w-4" />
                </button>
                <span className="text-white text-xs">{Math.round(timelineZoom * 100)}%</span>
                <button
                  onClick={() => setTimelineZoom(Math.min(3, timelineZoom + 0.25))}
                  className="text-white hover:text-orange-400 transition-colors"
                  title="Zoom in timeline"
                >
                  <MagnifyingGlassIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="text-white text-xs">
                {bookmarks.filter(b => !b.lockedById).length} unlocked, {bookmarks.filter(b => b.lockedById).length} locked
              </div>
            </div>
          </div>
        ) : null}

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handlePlayPause}
              className="text-white hover:text-orange-400 transition-colors"
            >
              {isPlaying ? (
                <PauseIcon className="h-6 w-6" />
              ) : (
                <PlayIcon className="h-6 w-6" />
              )}
            </button>

            <div className="text-white text-sm">
              {formatTimecode(currentTime * 1000)} / {formatTimecode(duration * 1000)}
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-white text-sm">Vol:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Bookmark Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={createBookmarkAtCurrentTime}
                className="text-white hover:text-orange-400 transition-colors flex items-center space-x-1"
                title="Create bookmark at current time"
              >
                <BookmarkIcon className="h-5 w-5" />
                <span className="text-sm">Bookmark</span>
              </button>
              
              {!isSelectingRange ? (
                <button
                  onClick={startBookmarkSelection}
                  className="text-white hover:text-orange-400 transition-colors flex items-center space-x-1"
                  title="Set custom range (I key)"
                >
                  <span className="text-sm">I/O</span>
                </button>
              ) : (
                <button
                  onClick={endBookmarkSelection}
                  className="text-orange-400 hover:text-orange-300 transition-colors flex items-center space-x-1"
                  title="Set out point (O key)"
                >
                  <span className="text-sm">O</span>
                </button>
              )}
            </div>

            <button
              onClick={handleFullscreen}
              className="text-white hover:text-orange-400 transition-colors"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15.586 13H14a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Selection Range Indicator */}
        {isSelectingRange && (
          <div className="mt-2 text-center">
            <div className="text-orange-400 text-sm">
              In point set at {formatTimecode(rangeStart * 1000)}. Move to desired out point.
            </div>
            <div className="text-gray-400 text-xs mt-1">
              Press 'O' or click the O button to set out point, or 'Escape' to cancel
            </div>
          </div>
        )}
        </div>
        )}
      </div>

      {/* Timeline Below Video */}
      {showTimelineBelow && useNLETimeline && (
        <div className="mt-4">
          <NLETimeline
            duration={duration}
            currentTime={currentTime}
            onSeek={(time) => {
              if (videoRef.current) {
                videoRef.current.currentTime = time
              }
            }}
            bookmarks={bookmarks}
            onBookmarkCreate={(startMs, endMs) => {
              setBookmarkStartTime(startMs)
              setBookmarkEndTime(endMs)
              setShowBookmarkModal(true)
            }}
            onBookmarkUpdate={(bookmarkId, startMs, endMs) => {
              // Handle bookmark updates
              console.log('Bookmark update:', bookmarkId, startMs, endMs)
            }}
            onBookmarkDelete={(bookmarkId) => {
              // Handle bookmark deletion
              console.log('Bookmark delete:', bookmarkId)
            }}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onStep={(direction, frames) => {
              if (videoRef.current) {
                const frameTime = frames / 30 // Assuming 30fps
                const newTime = direction === 'forward' 
                  ? Math.min(duration, currentTime + frameTime)
                  : Math.max(0, currentTime - frameTime)
                videoRef.current.currentTime = newTime
              }
            }}
            videoElement={videoRef.current}
            frameRate={30}
          />
        </div>
      )}

      {/* Bookmark Creation Modal */}
      <BookmarkCreationModal
        isOpen={showBookmarkModal}
        onClose={() => setShowBookmarkModal(false)}
        onSubmit={handleBookmarkSubmit}
        startTime={bookmarkStartTime}
        endTime={bookmarkEndTime}
        onTimeAdjust={handleTimeAdjust}
      />
    </div>
  )
}
