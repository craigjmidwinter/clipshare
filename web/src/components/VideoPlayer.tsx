"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { 
  PlayIcon, 
  PauseIcon, 
  BookmarkIcon,
  PlusIcon,
  XMarkIcon,
  ClockIcon
} from "@heroicons/react/24/outline"

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
    createdBy: {
      id: string
      plexUsername: string | null
    }
  }>
  currentUserId: string
}

interface BookmarkCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    label?: string
    publicNotes?: string
    privateNotes?: string
  }) => void
  startTime: number
  endTime: number
}

function BookmarkCreationModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  startTime, 
  endTime 
}: BookmarkCreationModalProps) {
  const [label, setLabel] = useState("")
  const [publicNotes, setPublicNotes] = useState("")
  const [privateNotes, setPrivateNotes] = useState("")

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      label: label.trim() || undefined,
      publicNotes: publicNotes.trim() || undefined,
      privateNotes: privateNotes.trim() || undefined,
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
          <div className="flex items-center text-sm text-gray-600">
            <ClockIcon className="h-4 w-4 mr-2" />
            <span>{formatTimecode(startTime)} - {formatTimecode(endTime)}</span>
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
  currentUserId
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
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
    }
  }, [isSelectingRange, rangeStart])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Set video source directly
    const videoSrc = `/api/plex/proxy?key=${plexKey}&serverId=${plexServerId}`
    video.src = videoSrc

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleDurationChange = () => setDuration(video.duration)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleVolumeChange = () => setVolume(video.volume)
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('durationchange', handleDurationChange)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('volumechange', handleVolumeChange)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('durationchange', handleDurationChange)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('volumechange', handleVolumeChange)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('keydown', handleKeyDown)
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
    <div className="relative bg-black rounded-lg overflow-hidden">
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full"
        controls={false}
        preload="metadata"
        crossOrigin="anonymous"
        onError={(e) => {
          const error = e.currentTarget.error
          console.error("Video error:", error)
          if (error) {
            console.error("Error code:", error.code)
            console.error("Error message:", error.message)
          }
        }}
      >
        Your browser does not support the video tag.
      </video>

      {/* Custom Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #f97316 0%, #f97316 ${(currentTime / (duration || 1)) * 100}%, #4b5563 ${(currentTime / (duration || 1)) * 100}%, #4b5563 100%)`
              }}
            />
            
            {/* Bookmark Markers */}
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="absolute top-0 h-2 bg-blue-500 opacity-70"
                style={{
                  left: `${(bookmark.startMs / 1000 / (duration || 1)) * 100}%`,
                  width: `${((bookmark.endMs - bookmark.startMs) / 1000 / (duration || 1)) * 100}%`,
                }}
                title={`${bookmark.label || 'Bookmark'} - ${formatTimecode(bookmark.startMs)} - ${formatTimecode(bookmark.endMs)}`}
              />
            ))}
          </div>
        </div>

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
              {!isSelectingRange ? (
                <button
                  onClick={startBookmarkSelection}
                  className="text-white hover:text-orange-400 transition-colors flex items-center space-x-1"
                  title="Press 'I' to set in point"
                >
                  <BookmarkIcon className="h-5 w-5" />
                  <span className="text-sm">I</span>
                </button>
              ) : (
                <button
                  onClick={endBookmarkSelection}
                  className="text-orange-400 hover:text-orange-300 transition-colors flex items-center space-x-1"
                  title="Press 'O' to set out point"
                >
                  <BookmarkIcon className="h-5 w-5" />
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
              Selecting range: {formatTimecode(rangeStart * 1000)} - {formatTimecode(currentTime * 1000)}
            </div>
            <div className="text-gray-400 text-xs mt-1">
              Press 'O' to set out point, or 'Escape' to cancel
            </div>
          </div>
        )}
      </div>

      {/* Bookmark Creation Modal */}
      <BookmarkCreationModal
        isOpen={showBookmarkModal}
        onClose={() => setShowBookmarkModal(false)}
        onSubmit={handleBookmarkSubmit}
        startTime={bookmarkStartTime}
        endTime={bookmarkEndTime}
      />
    </div>
  )
}
