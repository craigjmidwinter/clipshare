'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  MagnifyingGlassIcon, 
  MagnifyingGlassMinusIcon,
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon
} from '@heroicons/react/24/outline'
import FramePreviewGenerator, { useFramePreviews } from './FramePreviewGenerator'

interface Bookmark {
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
}

interface NLETimelineProps {
  duration: number // in seconds
  currentTime: number // in seconds
  onSeek: (time: number) => void
  bookmarks: Bookmark[]
  onBookmarkCreate: (startMs: number, endMs: number) => void
  onBookmarkUpdate: (bookmarkId: string, startMs: number, endMs: number) => void
  onBookmarkDelete: (bookmarkId: string) => void
  isPlaying: boolean
  onPlayPause: () => void
  onStep: (direction: 'forward' | 'backward', frames: number) => void
  videoElement?: HTMLVideoElement | null
  frameRate?: number
}

export default function NLETimeline({
  duration,
  currentTime,
  onSeek,
  bookmarks,
  onBookmarkCreate,
  onBookmarkUpdate,
  onBookmarkDelete,
  isPlaying,
  onPlayPause,
  onStep,
  videoElement,
  frameRate = 30
}: NLETimelineProps) {
  // Calculate default zoom to fit full duration in viewport
  const containerWidth = 1000 // Default container width
  const defaultZoom = containerWidth / (duration * frameRate * 4) // 4 pixels per frame at zoom 1
  const [zoom, setZoom] = useState(Math.max(0.01, defaultZoom)) // Start with full duration visible
  const [scrollPosition, setScrollPosition] = useState(0)
  const [isDragging, setIsDragging] = useState<'playhead' | 'in' | 'out' | 'bookmark' | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, time: 0 })
  const [selectionStart, setSelectionStart] = useState<number | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null)
  
  const timelineRef = useRef<HTMLDivElement>(null)
  const frameWidth = 4 // pixels per frame at zoom level 1
  const totalWidth = Math.max(1000, duration * frameRate * frameWidth * zoom) // Minimum width
  
  // Frame preview management
  const { framePreviews, addFramePreview, getFramePreview } = useFramePreviews()
  
  // Debug frame previews
  useEffect(() => {
    console.log('NLETimeline: Frame previews updated', {
      count: framePreviews.size,
      frames: Array.from(framePreviews.keys()).slice(0, 10)
    })
  }, [framePreviews])

  // Update zoom when container becomes available
  useEffect(() => {
    if (timelineRef.current && duration > 0) {
      const containerWidth = timelineRef.current.clientWidth
      const optimalZoom = containerWidth / (duration * frameRate * frameWidth)
      setZoom(Math.max(0.01, optimalZoom))
    }
  }, [duration, frameRate, frameWidth])
  
  const formatTimecode = (seconds: number) => {
    const totalSeconds = Math.floor(seconds)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    const frames = Math.floor((seconds % 1) * frameRate)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
  }

  const timeToPosition = (time: number) => {
    return (time * frameRate * frameWidth * zoom) - scrollPosition
  }

  const positionToTime = (position: number) => {
    return (position + scrollPosition) / (frameRate * frameWidth * zoom)
  }

  const handleMouseDown = (e: React.MouseEvent, type: 'playhead' | 'in' | 'out' | 'bookmark', bookmarkId?: string) => {
    e.preventDefault()
    setIsDragging(type)
    setDragStart({ x: e.clientX, time: positionToTime(e.clientX - timelineRef.current!.getBoundingClientRect().left) })
    
    if (type === 'playhead') {
      onSeek(positionToTime(e.clientX - timelineRef.current!.getBoundingClientRect().left))
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !timelineRef.current) return

    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const newTime = Math.max(0, Math.min(duration, positionToTime(x)))

    if (isDragging === 'playhead') {
      onSeek(newTime)
    } else if (isDragging === 'in' && selectionEnd !== null) {
      setSelectionStart(Math.min(newTime, selectionEnd))
    } else if (isDragging === 'out' && selectionStart !== null) {
      setSelectionEnd(Math.max(newTime, selectionStart))
    }
  }

  const handleMouseUp = () => {
    if (isDragging === 'in' || isDragging === 'out') {
      if (selectionStart !== null && selectionEnd !== null && selectionStart !== selectionEnd) {
        onBookmarkCreate(selectionStart * 1000, selectionEnd * 1000)
      }
      setSelectionStart(null)
      setSelectionEnd(null)
    }
    setIsDragging(null)
  }

  const handleTimelineClick = (e: React.MouseEvent) => {
    const rect = timelineRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const clickedTime = positionToTime(x)
    
    if (e.shiftKey) {
      // Shift+click to set out point
      if (selectionStart === null) {
        setSelectionStart(clickedTime)
      } else {
        setSelectionEnd(clickedTime)
      }
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd+click to set in point
      if (selectionEnd === null) {
        setSelectionEnd(clickedTime)
      } else {
        setSelectionStart(clickedTime)
      }
    } else {
      // Regular click to seek
      onSeek(clickedTime)
    }
  }

  const handleZoom = (direction: 'in' | 'out') => {
    const newZoom = direction === 'in' ? zoom * 1.5 : zoom / 1.5
    // Calculate zoom limits based on duration
    // Min zoom: fit full duration in 100px (very zoomed out)
    // Max zoom: show 10 seconds in full width (very zoomed in)
    const containerWidth = timelineRef.current?.clientWidth || 1000
    const minZoom = 100 / (duration * frameRate * frameWidth) // Very zoomed out
    const maxZoom = containerWidth / (10 * frameRate * frameWidth) // Show 10 seconds max
    setZoom(Math.max(minZoom, Math.min(maxZoom, newZoom)))
  }

  const handleFitToWindow = () => {
    if (timelineRef.current) {
      const containerWidth = timelineRef.current.clientWidth
      const optimalZoom = containerWidth / (duration * frameRate * frameWidth)
      setZoom(Math.max(0.01, optimalZoom)) // Remove max limit for fit to window
      setScrollPosition(0)
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollPosition(e.currentTarget.scrollLeft)
  }

  const generateFrameMarkers = () => {
    const markers = []
    // Dynamic interval based on zoom level
    let interval = 1
    if (zoom < 0.1) interval = 60 // 1 minute intervals for very zoomed out
    else if (zoom < 0.3) interval = 30 // 30 second intervals
    else if (zoom < 0.5) interval = 10 // 10 second intervals
    else if (zoom < 1) interval = 5 // 5 second intervals
    else if (zoom < 2) interval = 1 // 1 second intervals
    else interval = 0.5 // Half second intervals for high zoom
    
    // Calculate visible time range based on scroll position and zoom
    const containerWidth = timelineRef.current?.clientWidth || 1000
    const pixelsPerSecond = frameRate * frameWidth * zoom
    
    const startTime = Math.max(0, scrollPosition / pixelsPerSecond)
    const endTime = Math.min(duration, (scrollPosition + containerWidth) / pixelsPerSecond)
    
    // Round to interval boundaries
    const roundedStartTime = Math.floor(startTime / interval) * interval
    const roundedEndTime = Math.ceil(endTime / interval) * interval
    
    for (let time = roundedStartTime; time <= roundedEndTime; time += interval) {
      if (time >= 0 && time <= duration) {
        const position = timeToPosition(time)
        const isMajorMarker = time % (interval * 5) === 0 // Major markers every 5 intervals
        markers.push(
          <div
            key={time}
            className={`absolute top-0 bottom-0 w-px ${isMajorMarker ? 'bg-gray-300' : 'bg-gray-500'}`}
            style={{ left: position }}
          >
            {isMajorMarker && (
              <div className="absolute -top-6 text-xs text-gray-500 whitespace-nowrap font-mono">
                {formatTimecode(time)}
              </div>
            )}
          </div>
        )
      }
    }
    return markers
  }

  const generateFramePreviews = () => {
    const frames = []
    const previewInterval = Math.max(1, Math.floor(30 / zoom)) // Show every Nth frame based on zoom
    
    // Calculate visible frame range based on scroll position and zoom
    const containerWidth = timelineRef.current?.clientWidth || 1000
    const pixelsPerFrame = frameWidth * zoom
    
    const startFrame = Math.max(0, Math.floor(scrollPosition / pixelsPerFrame))
    const endFrame = Math.min(duration * frameRate, Math.ceil((scrollPosition + containerWidth) / pixelsPerFrame))
    
    for (let frame = startFrame; frame <= endFrame; frame += previewInterval) {
      if (frame >= 0 && frame < duration * frameRate) {
        const time = frame / frameRate
        const position = timeToPosition(time)
        const framePreview = getFramePreview(frame)
        
        frames.push(
          <div
            key={frame}
            className="absolute top-0 h-full bg-gray-600 border-r border-gray-500"
            style={{ 
              left: position,
              width: Math.max(1, frameWidth * zoom)
            }}
            title={`Frame ${frame} - ${formatTimecode(time)}`}
          >
            {framePreview ? (
              <img
                src={framePreview}
                alt={`Frame ${frame}`}
                className="w-full h-full object-cover opacity-80"
                style={{ width: Math.max(1, frameWidth * zoom) }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-500 to-gray-700 opacity-60" />
            )}
          </div>
        )
      }
    }
    return frames
  }

  return (
    <div className="bg-gray-900 text-white p-3">
      {/* Timeline Controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-4">
          {/* Playback Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onStep('backward', 1)}
              className="p-2 hover:bg-gray-700 rounded"
              title="Step back 1 frame"
            >
              <BackwardIcon className="h-4 w-4" />
            </button>
            <button
              onClick={onPlayPause}
              className="p-2 hover:bg-gray-700 rounded"
            >
              {isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => onStep('forward', 1)}
              className="p-2 hover:bg-gray-700 rounded"
              title="Step forward 1 frame"
            >
              <ForwardIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Timecode Display */}
          <div className="text-sm font-mono">
            {formatTimecode(currentTime)} / {formatTimecode(duration)}
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleZoom('out')}
            className="p-2 hover:bg-gray-700 rounded"
            title="Zoom out"
          >
            <MagnifyingGlassMinusIcon className="h-4 w-4" />
          </button>
          <button
            onClick={handleFitToWindow}
            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
            title="Fit to window"
          >
            Fit
          </button>
          <span className="text-sm">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => handleZoom('in')}
            className="p-2 hover:bg-gray-700 rounded"
            title="Zoom in"
          >
            <MagnifyingGlassIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Timeline Container */}
      <div className="relative bg-gray-800 rounded-lg overflow-hidden">
        {/* Frame Preview Ribbon */}
        <div className="h-12 bg-gray-700 border-b border-gray-600 relative overflow-hidden">
          <div className="absolute inset-0">
            {generateFramePreviews()}
          </div>
          {videoElement && (
            <FramePreviewGenerator
              videoElement={videoElement}
              frameRate={frameRate}
              duration={duration}
              zoom={zoom}
              scrollPosition={scrollPosition}
              containerWidth={timelineRef.current?.clientWidth || 1000}
              onFrameGenerated={addFramePreview}
            />
          )}
        </div>

        {/* Main Timeline */}
        <div
          ref={timelineRef}
          className="relative h-16 bg-gray-800 cursor-pointer overflow-x-auto"
          onMouseDown={handleTimelineClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onScroll={handleScroll}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="relative" style={{ width: totalWidth, height: '100%' }}>
            {/* Frame Markers */}
            {generateFrameMarkers()}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
              style={{ left: timeToPosition(currentTime) }}
            >
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-red-500" />
            </div>

            {/* Selection Range */}
            {selectionStart !== null && selectionEnd !== null && (
              <div
                className="absolute top-2 bottom-2 bg-orange-500 opacity-50 rounded"
                style={{
                  left: timeToPosition(Math.min(selectionStart, selectionEnd)),
                  width: timeToPosition(Math.abs(selectionEnd - selectionStart))
                }}
              />
            )}

            {/* In Point Handle */}
            {selectionStart !== null && (
              <div
                className="absolute top-0 bottom-0 w-1 bg-green-500 cursor-ew-resize z-10"
                style={{ left: timeToPosition(selectionStart) }}
                onMouseDown={(e) => handleMouseDown(e, 'in')}
              >
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 text-xs text-green-400">
                  IN
                </div>
              </div>
            )}

            {/* Out Point Handle */}
            {selectionEnd !== null && (
              <div
                className="absolute top-0 bottom-0 w-1 bg-red-500 cursor-ew-resize z-10"
                style={{ left: timeToPosition(selectionEnd) }}
                onMouseDown={(e) => handleMouseDown(e, 'out')}
              >
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 text-xs text-red-400">
                  OUT
                </div>
              </div>
            )}

            {/* Bookmarks */}
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className={`absolute top-4 bottom-4 rounded cursor-move z-5 ${
                  bookmark.lockedById ? 'bg-red-600' : 'bg-blue-600'
                } opacity-80 hover:opacity-100`}
                style={{
                  left: timeToPosition(bookmark.startMs / 1000),
                  width: timeToPosition((bookmark.endMs - bookmark.startMs) / 1000)
                }}
                onMouseDown={(e) => handleMouseDown(e, 'bookmark', bookmark.id)}
                title={`${bookmark.label || 'Untitled'} - ${formatTimecode(bookmark.startMs / 1000)} → ${formatTimecode(bookmark.endMs / 1000)}`}
              >
                <div className="p-1 text-xs truncate">
                  {bookmark.label || 'Untitled'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Instructions */}
        <div className="p-2 bg-gray-700 text-xs text-gray-300">
          <div className="flex justify-between">
            <span>Click to seek • Ctrl/Cmd+Click to set IN • Shift+Click to set OUT • Drag handles to adjust</span>
            <div className="flex items-center space-x-2">
              <span>{bookmarks.length} bookmarks</span>
              {videoElement && framePreviews.size === 0 && (
                <span className="text-blue-400">Generating thumbnails...</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
