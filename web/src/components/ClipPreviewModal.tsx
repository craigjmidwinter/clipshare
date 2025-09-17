'use client'

import React, { useState, useRef, useEffect } from 'react'
import { XMarkIcon, PlayIcon, PauseIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline'

interface ClipPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  bookmark: {
    id: string
    label: string | null
    startMs: number
    endMs: number
    publicNotes?: string | null
    privateNotes?: string | null
  }
  workspaceId: string
}

export default function ClipPreviewModal({
  isOpen,
  onClose,
  bookmark,
  workspaceId
}: ClipPreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [streamToken, setStreamToken] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handlePlayPause = () => {
    if (!videoRef.current) return
    
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleMuteToggle = () => {
    if (!videoRef.current) return
    
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return
    
    const newTime = parseFloat(e.target.value)
    videoRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleTimeUpdate = () => {
    if (!videoRef.current) return
    setCurrentTime(videoRef.current.currentTime)
  }

  const handleLoadStart = () => {
    console.log('Video load started for:', clipUrl)
  }

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return
    console.log('Video metadata loaded for:', clipUrl)
    setDuration(videoRef.current.duration)
    setIsLoading(false)
  }

  const handleError = (event: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = event.currentTarget
    const error = video.error
    let errorMessage = 'Failed to load clip preview'
    
    if (error) {
      switch (error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = 'Video loading was aborted'
          break
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = 'Network error while loading video'
          break
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = 'Video decoding error - try refreshing the page'
          break
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Video format not supported'
          break
        default:
          errorMessage = `Video error: ${error.message || 'Unknown error'}`
      }
    }
    
    // Log error details without using console.error to avoid VideoPlayer filter
    const errorDetails = {
      clipUrl,
      errorCode: error?.code,
      errorMessage: error?.message,
      timestamp: new Date().toISOString(),
      videoReadyState: video.readyState,
      videoNetworkState: video.networkState
    }
    
    // Use console.log instead of console.error to avoid VideoPlayer filter
    console.log('ClipPreviewModal Error:', errorDetails)
    
    // Retry logic for decode errors
    if (error?.code === MediaError.MEDIA_ERR_DECODE && retryCount < 2) {
      console.log(`Retrying video load (attempt ${retryCount + 1})`)
      setRetryCount(prev => prev + 1)
      setIsLoading(true)
      setError(null)
      
      // Try different approaches on retry
      setTimeout(() => {
        if (videoRef.current) {
          // Try changing preload strategy
          if (retryCount === 1) {
            videoRef.current.preload = 'metadata'
          } else {
            videoRef.current.preload = 'auto'
          }
          videoRef.current.load()
        }
      }, 1000)
      return
    }
    
    setError(errorMessage)
    setIsLoading(false)
  }

  const handleEnded = () => {
    setIsPlaying(false)
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      setCurrentTime(0)
    }
  }

  const clipDuration = (bookmark.endMs - bookmark.startMs) / 1000

  // Fetch stream token when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('Opening preview modal for:', bookmark.label || 'Untitled')
      setIsPlaying(false)
      setIsMuted(true)
      setCurrentTime(0)
      setError(null)
      setIsLoading(true)
      setStreamToken(null)
      setRetryCount(0)

      // Fetch stream token
      const fetchToken = async () => {
        try {
          const response = await fetch(`/api/workspaces/${workspaceId}/clips/${bookmark.id}/token`)
          if (response.ok) {
            const data = await response.json()
            setStreamToken(data.token)
            console.log('Stream token obtained:', data.token.substring(0, 10) + '...')
            setIsLoading(false) // ✅ Set loading to false when token is obtained
          } else {
            console.error('Failed to get stream token:', response.status)
            setError('Failed to authenticate clip access')
            setIsLoading(false)
          }
        } catch (error) {
          console.error('Error fetching stream token:', error)
          setError('Failed to authenticate clip access')
          setIsLoading(false)
        }
      }

      fetchToken()
    }
  }, [isOpen, workspaceId, bookmark.id])

  // Generate clip URL with token
  const clipUrl = streamToken 
    ? `/api/workspaces/${workspaceId}/clips/${bookmark.id}/stream?token=${streamToken}`
    : null

  // Debug logging
  useEffect(() => {
    if (clipUrl) {
      console.log('Clip URL generated:', clipUrl)
    }
  }, [clipUrl])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {bookmark.label || 'Untitled Clip'}
            </h2>
            <p className="text-sm text-gray-400">
              Duration: {formatTime(clipDuration)} | 
              Range: {formatTime(bookmark.startMs / 1000)} - {formatTime(bookmark.endMs / 1000)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Video Player */}
        <div className="relative bg-black">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white">Loading preview...</div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-red-400 text-center">
                <p>{error}</p>
                <p className="text-sm mt-2">Clip may still be processing or unavailable</p>
              </div>
            </div>
          )}

          {clipUrl ? (
            <video
              ref={videoRef}
              src={clipUrl}
              className="w-full h-auto max-h-[60vh]"
              onLoadStart={handleLoadStart}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onError={handleError}
              onEnded={handleEnded}
              muted={isMuted}
              preload="none"
              playsInline
              controls={false}
              disablePictureInPicture
            />
          ) : (
            <div className="w-full h-64 flex items-center justify-center text-white">
              {isLoading ? 'Loading authentication...' : 'Failed to authenticate'}
            </div>
          )}

          {/* Video Controls Overlay */}
          {!isLoading && !error && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
              {/* Progress Bar */}
              <div className="mb-4">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handlePlayPause}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {isPlaying ? (
                      <PauseIcon className="h-6 w-6 text-white" />
                    ) : (
                      <PlayIcon className="h-6 w-6 text-white" />
                    )}
                  </button>

                  <button
                    onClick={handleMuteToggle}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {isMuted ? (
                      <SpeakerXMarkIcon className="h-6 w-6 text-white" />
                    ) : (
                      <SpeakerWaveIcon className="h-6 w-6 text-white" />
                    )}
                  </button>

                  <div className="text-sm text-white font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Clip Details */}
        {(bookmark.publicNotes || bookmark.privateNotes) && (
          <div className="p-4 border-t border-gray-700">
            {bookmark.publicNotes && (
              <div className="mb-2">
                <h3 className="text-sm font-medium text-gray-300 mb-1">Public Notes</h3>
                <p className="text-sm text-gray-400">{bookmark.publicNotes}</p>
              </div>
            )}
            {bookmark.privateNotes && (
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-1">Private Notes</h3>
                <p className="text-sm text-gray-400">{bookmark.privateNotes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  )
}
