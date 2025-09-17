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
  onBookmarkCreate: (bookmark: { startMs: number; endMs: number; label?: string }) => void
  onBookmarkUpdate: (bookmarkId: string, startMs: number, endMs: number) => void
  onBookmarkDelete: (bookmarkId: string) => void
  isPlaying: boolean
  onPlayPause: () => void
  onStep: (direction: 'forward' | 'backward', frames: number) => void
  videoElement?: HTMLVideoElement | null
  frameRate?: number
  workspaceId?: string
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
  frameRate = 30,
  workspaceId
}: NLETimelineProps) {
  
  // Debug logging (commented out to prevent console spam)
  // console.log('NLETimeline render:', {
  //   duration,
  //   currentTime,
  //   bookmarksCount: bookmarks.length,
  //   videoElement: !!videoElement,
  //   frameRate,
  //   isPlaying,
  //   hasOnBookmarkUpdate: !!onBookmarkUpdate,
  //   hasOnBookmarkDelete: !!onBookmarkDelete,
  //   firstBookmark: bookmarks[0]
  // })
  
  // Calculate default zoom to fit full duration in viewport
  const containerWidth = 1000 // Default container width
  const defaultZoom = containerWidth / (duration * frameRate * 4) // 4 pixels per frame at zoom 1
  const [zoom, setZoom] = useState(Math.max(0.01, defaultZoom)) // Start with full duration visible
  const [scrollPosition, setScrollPosition] = useState(0)
  const [isDragging, setIsDragging] = useState<'playhead' | 'in' | 'out' | 'bookmark-body' | 'bookmark-start' | 'bookmark-end' | 'selection' | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, time: 0 })
  const [selectionStart, setSelectionStart] = useState<number | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null)
  const [draggedBookmarkId, setDraggedBookmarkId] = useState<string | null>(null)
  const [dragPreview, setDragPreview] = useState<{ startMs: number; endMs: number } | null>(null)
  const [showNamePrompt, setShowNamePrompt] = useState(false)
  const [pendingBookmark, setPendingBookmark] = useState<{ startMs: number; endMs: number } | null>(null)
  const [clipName, setClipName] = useState("")
  
  const timelineRef = useRef<HTMLDivElement>(null)
  const frameWidth = 4 // pixels per frame at zoom level 1
  const totalWidth = Math.max(1000, isFinite(duration) && isFinite(frameRate) && isFinite(frameWidth) && isFinite(zoom) 
    ? duration * frameRate * frameWidth * zoom 
    : 1000) // Minimum width with validation
  
  // Frame preview management
  const { framePreviews, addFramePreview, getFramePreview } = useFramePreviews()

  // Server-provided per-second frames for ribbon
  const getServerPreviewBySecond = useCallback((second: number) => {
    if (!workspaceId) return null
    return `/api/workspaces/${workspaceId}/frames?second=${second}`
  }, [workspaceId])
  
  // Debug frame previews
  useEffect(() => {
    console.log('NLETimeline: Frame previews updated', {
      count: framePreviews.size,
      frames: Array.from(framePreviews.keys()).slice(0, 10)
    })
  }, [framePreviews])

  // Add document-level event listeners for drag operations
  useEffect(() => {
    if (isDragging && (isDragging === 'bookmark-body' || isDragging === 'bookmark-start' || isDragging === 'bookmark-end' || isDragging === 'selection')) {
      const handleDocumentMouseMove = (e: MouseEvent) => {
        handleMouseMove(e)
      }
      
      const handleDocumentMouseUp = (e: MouseEvent) => {
        handleMouseUp(e)
      }
      
      document.addEventListener('mousemove', handleDocumentMouseMove)
      document.addEventListener('mouseup', handleDocumentMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleDocumentMouseMove)
        document.removeEventListener('mouseup', handleDocumentMouseUp)
        // Clear any pending selection when component unmounts or drag is cancelled
        if (isDragging === 'selection') {
          setSelectionStart(null)
          setSelectionEnd(null)
        }
      }
    }
  }, [isDragging])

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
    // Validate inputs to prevent NaN/Infinity
    if (!isFinite(time) || !isFinite(frameRate) || !isFinite(frameWidth) || !isFinite(zoom) || !isFinite(scrollPosition)) {
      return 0
    }
    if (frameRate <= 0 || frameWidth <= 0 || zoom <= 0) {
      return 0
    }
    
    const position = (time * frameRate * frameWidth * zoom) - scrollPosition
    return isFinite(position) ? position : 0
  }

  const positionToTime = (position: number) => {
    // Validate inputs to prevent NaN/Infinity
    if (!isFinite(position) || !isFinite(scrollPosition) || !isFinite(frameRate) || !isFinite(frameWidth) || !isFinite(zoom)) {
      return 0
    }
    if (frameRate <= 0 || frameWidth <= 0 || zoom <= 0) {
      return 0
    }
    
    const time = (position + scrollPosition) / (frameRate * frameWidth * zoom)
    return isFinite(time) ? time : 0
  }

  const handleMouseDown = (e: React.MouseEvent, type: 'playhead' | 'in' | 'out' | 'bookmark-body' | 'bookmark-start' | 'bookmark-end', bookmarkId?: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    const rect = timelineRef.current!.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseTime = positionToTime(mouseX)
    
    // console.log('MouseDown:', { type, bookmarkId, mouseTime, hasOnBookmarkUpdate: !!onBookmarkUpdate })
    
    setIsDragging(type)
    setDragStart({ x: e.clientX, time: mouseTime })
    
    if (type === 'playhead') {
      onSeek(mouseTime)
    }
    
    if (bookmarkId && (type === 'bookmark-body' || type === 'bookmark-start' || type === 'bookmark-end')) {
      setDraggedBookmarkId(bookmarkId)
      console.log('Set dragged bookmark:', bookmarkId)
    }
  }

  const handleMouseMove = (e: React.MouseEvent | MouseEvent) => {
    if (!isDragging || !timelineRef.current) return

    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const newTime = Math.max(0, Math.min(duration, positionToTime(x)))

    if (isDragging === 'playhead') {
      onSeek(newTime)
    } else if (isDragging === 'selection') {
      // Handle drag-to-create selection
      const startTime = Math.min(dragStart.time, newTime)
      const endTime = Math.max(dragStart.time, newTime)
      setSelectionStart(startTime)
      setSelectionEnd(endTime)
    } else if (isDragging === 'in' && selectionEnd !== null) {
      setSelectionStart(Math.min(newTime, selectionEnd))
    } else if (isDragging === 'out' && selectionStart !== null) {
      setSelectionEnd(Math.max(newTime, selectionStart))
    } else if (draggedBookmarkId && (isDragging === 'bookmark-body' || isDragging === 'bookmark-start' || isDragging === 'bookmark-end')) {
      // Calculate real-time drag preview position
      const bookmark = bookmarks.find(b => b.id === draggedBookmarkId)
      if (bookmark) {
        const currentStartTime = bookmark.startMs / 1000
        const currentEndTime = bookmark.endMs / 1000
        
        if (isDragging === 'bookmark-body') {
          // Move entire bookmark - calculate offset from initial click position
          const bookmarkDuration = currentEndTime - currentStartTime
          const dragOffset = newTime - dragStart.time
          const newStartTime = Math.max(0, Math.min(duration - bookmarkDuration, currentStartTime + dragOffset))
          const newEndTime = newStartTime + bookmarkDuration
          
          setDragPreview({ startMs: newStartTime * 1000, endMs: newEndTime * 1000 })
        } else if (isDragging === 'bookmark-start') {
          // Resize start time
          const newStartTime = Math.max(0, Math.min(currentEndTime - 0.1, newTime))
          setDragPreview({ startMs: newStartTime * 1000, endMs: currentEndTime * 1000 })
        } else if (isDragging === 'bookmark-end') {
          // Resize end time
          const newEndTime = Math.max(currentStartTime + 0.1, Math.min(duration, newTime))
          setDragPreview({ startMs: currentStartTime * 1000, endMs: newEndTime * 1000 })
        }
      }
    }
  }

  const handleMouseUp = (e: React.MouseEvent | MouseEvent) => {
    // console.log('MouseUp:', { isDragging, draggedBookmarkId, hasOnBookmarkUpdate: !!onBookmarkUpdate })
    
    if (isDragging === 'in' || isDragging === 'out' || isDragging === 'selection') {
      if (selectionStart !== null && selectionEnd !== null && Math.abs(selectionEnd - selectionStart) > 0.1) {
        // Show name prompt for drag-to-create
        if (isDragging === 'selection') {
          setPendingBookmark({ startMs: selectionStart * 1000, endMs: selectionEnd * 1000 })
          setShowNamePrompt(true)
        } else {
          // For in/out point adjustments, create bookmark directly
          onBookmarkCreate({ startMs: selectionStart * 1000, endMs: selectionEnd * 1000 })
        }
        // Clear selection after creating bookmark to allow creating subsequent clips
        setSelectionStart(null)
        setSelectionEnd(null)
      } else {
        // Clear selection if it's too small or invalid
        setSelectionStart(null)
        setSelectionEnd(null)
      }
    } else if (draggedBookmarkId && (isDragging === 'bookmark-body' || isDragging === 'bookmark-start' || isDragging === 'bookmark-end')) {
      // Handle bookmark drag completion - get current mouse position from the mouseup event
      const rect = timelineRef.current!.getBoundingClientRect()
      const currentMouseX = e.clientX - rect.left // Use the actual mouseup position
      const currentTime = Math.max(0, Math.min(duration, positionToTime(currentMouseX)))
      
      const bookmark = bookmarks.find(b => b.id === draggedBookmarkId)
      if (bookmark) {
        const currentStartTime = bookmark.startMs / 1000
        const currentEndTime = bookmark.endMs / 1000
        
        if (isDragging === 'bookmark-body') {
          // Move entire bookmark - calculate offset from initial click position
          const bookmarkDuration = currentEndTime - currentStartTime
          const dragOffset = currentTime - dragStart.time // currentTime is the mouse position time
          const newStartTime = Math.max(0, Math.min(duration - bookmarkDuration, currentStartTime + dragOffset))
          const newEndTime = newStartTime + bookmarkDuration
          
          // console.log('Bookmark body drag:', {
          //   originalStart: currentStartTime,
          //   originalEnd: currentEndTime,
          //   dragOffset,
          //   newStartTime,
          //   newEndTime,
          //   currentTime,
          //   dragStartTime: dragStart.time
          // })
          
          console.log('Timeline: Calling onBookmarkUpdate for bookmark body drag:', {
            bookmarkId: draggedBookmarkId,
            startMs: newStartTime * 1000,
            endMs: newEndTime * 1000,
            hasOnBookmarkUpdate: !!onBookmarkUpdate
          })
          onBookmarkUpdate(draggedBookmarkId, newStartTime * 1000, newEndTime * 1000)
        } else if (isDragging === 'bookmark-start') {
          // Resize start time - use current mouse position directly
          const newStartTime = Math.max(0, Math.min(currentEndTime - 0.1, currentTime))
          
          // console.log('Bookmark start resize:', {
          //   originalStart: currentStartTime,
          //   originalEnd: currentEndTime,
          //   newStartTime,
          //   currentTime
          // })
          
          console.log('Timeline: Calling onBookmarkUpdate for start resize:', {
            bookmarkId: draggedBookmarkId,
            startMs: newStartTime * 1000,
            endMs: currentEndTime * 1000,
            hasOnBookmarkUpdate: !!onBookmarkUpdate
          })
          onBookmarkUpdate(draggedBookmarkId, newStartTime * 1000, currentEndTime * 1000)
        } else if (isDragging === 'bookmark-end') {
          // Resize end time - use current mouse position directly
          const newEndTime = Math.max(currentStartTime + 0.1, Math.min(duration, currentTime))
          
          // console.log('Bookmark end resize:', {
          //   originalStart: currentStartTime,
          //   originalEnd: currentEndTime,
          //   newEndTime,
          //   currentTime
          // })
          
          console.log('Timeline: Calling onBookmarkUpdate for end resize:', {
            bookmarkId: draggedBookmarkId,
            startMs: currentStartTime * 1000,
            endMs: newEndTime * 1000,
            hasOnBookmarkUpdate: !!onBookmarkUpdate
          })
          onBookmarkUpdate(draggedBookmarkId, currentStartTime * 1000, newEndTime * 1000)
        }
      }
      setDraggedBookmarkId(null)
      setDragPreview(null) // Clear drag preview
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
      // Regular click - start drag-to-create selection immediately
      setIsDragging('selection')
      setDragStart({ x: e.clientX, time: clickedTime })
      setSelectionStart(clickedTime)
      setSelectionEnd(clickedTime)
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

  const handleNamePromptSubmit = () => {
    if (pendingBookmark) {
      onBookmarkCreate({ 
        startMs: pendingBookmark.startMs, 
        endMs: pendingBookmark.endMs,
        label: clipName.trim() || undefined
      })
      setShowNamePrompt(false)
      setPendingBookmark(null)
      setClipName("")
    }
  }

  const handleNamePromptCancel = () => {
    setShowNamePrompt(false)
    setPendingBookmark(null)
    setClipName("")
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollPosition(e.currentTarget.scrollLeft)
  }

  const generateFrameMarkers = () => {
    const markers = []
    // Dynamic interval based on zoom level - more frequent labels
    let interval = 1
    let minorInterval = 0.5
    if (zoom < 0.05) { interval = 600; minorInterval = 120 } // 10 minute intervals, 2 minute minors
    else if (zoom < 0.1) { interval = 300; minorInterval = 60 } // 5 minute intervals, 1 minute minors
    else if (zoom < 0.2) { interval = 120; minorInterval = 30 } // 2 minute intervals, 30 second minors
    else if (zoom < 0.4) { interval = 60; minorInterval = 15 } // 1 minute intervals, 15 second minors
    else if (zoom < 0.8) { interval = 30; minorInterval = 10 } // 30 second intervals, 10 second minors
    else if (zoom < 1.5) { interval = 10; minorInterval = 5 } // 10 second intervals, 5 second minors
    else if (zoom < 3) { interval = 5; minorInterval = 1 } // 5 second intervals, 1 second minors
    else if (zoom < 6) { interval = 1; minorInterval = 0.5 } // 1 second intervals, 0.5 second minors
    else { interval = 0.5; minorInterval = 0.1 } // 0.5 second intervals, 0.1 second minors
    
    // Calculate visible time range based on scroll position and zoom
    const containerWidth = timelineRef.current?.clientWidth || 1000
    const pixelsPerSecond = isFinite(frameRate * frameWidth * zoom) && frameRate * frameWidth * zoom > 0 
      ? frameRate * frameWidth * zoom 
      : 1
    
    const startTime = Math.max(0, scrollPosition / pixelsPerSecond)
    const endTime = Math.min(duration, (scrollPosition + containerWidth) / pixelsPerSecond)
    
    // Round to interval boundaries
    const roundedStartTime = Math.floor(startTime / minorInterval) * minorInterval
    const roundedEndTime = Math.ceil(endTime / minorInterval) * minorInterval
    
    for (let time = roundedStartTime; time <= roundedEndTime; time += minorInterval) {
      if (time >= 0 && time <= duration) {
        const position = timeToPosition(time)
        const isMajorMarker = Math.abs(time % interval) < minorInterval / 2 // Major markers at interval boundaries
        const isMediumMarker = Math.abs(time % (interval / 2)) < minorInterval / 2 && !isMajorMarker
        
        markers.push(
          <div
            key={time}
            className={`absolute top-0 bottom-0 w-px ${
              isMajorMarker ? 'bg-gray-200' : 
              isMediumMarker ? 'bg-gray-400' : 
              'bg-gray-600'
            }`}
            style={{ left: position }}
          >
            {/* Show timecode labels for major and medium markers */}
            {(isMajorMarker || isMediumMarker) && (
              <div className={`absolute -top-6 text-xs whitespace-nowrap font-mono px-1 rounded ${
                isMajorMarker ? 'text-white bg-gray-700' : 'text-gray-300 bg-gray-800'
              }`}>
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
    // Choose a seconds-per-thumb that keeps tiles around ~96px wide
    const pixelsPerSecond = isFinite(frameRate * frameWidth * zoom) && frameRate * frameWidth * zoom > 0 ? frameRate * frameWidth * zoom : 1
    const targetTilePx = 96
    const rawSeconds = Math.max(0.25, targetTilePx / pixelsPerSecond)
    // snap to nice steps
    const steps = [0.25, 0.5, 1, 2, 5, 10, 30, 60]
    const secondsPerThumb = steps.reduce((prev, curr) => Math.abs(curr - rawSeconds) < Math.abs(prev - rawSeconds) ? curr : prev, steps[0])
    
    // Calculate visible frame range based on scroll position and zoom
    const containerWidth = timelineRef.current?.clientWidth || 1000
    const startSecond = Math.max(0, Math.floor(scrollPosition / pixelsPerSecond))
    const endSecond = Math.min(Math.ceil(duration), Math.ceil((scrollPosition + containerWidth) / pixelsPerSecond))
    const stepSeconds = Math.max(1, Math.round(secondsPerThumb))

    for (let sec = Math.floor(startSecond); sec <= endSecond; sec += stepSeconds) {
      if (sec >= 0 && sec <= duration) {
        // Place tile aligned to exact second to keep correlation
        const tileWidth = Math.max(24, Math.min(192, Math.floor(pixelsPerSecond * stepSeconds)))
        const position = timeToPosition(sec)
        const nearestSecond = Math.max(0, Math.round(sec))
        const frameForCache = Math.floor(nearestSecond * frameRate)
        const dataUrl = getFramePreview(frameForCache)
        const serverUrl = getServerPreviewBySecond(nearestSecond)
        
        frames.push(
          <div
            key={`sec-${sec}`}
            className="absolute top-0 h-full bg-gray-700 border-r border-gray-600 overflow-hidden"
            style={{ 
              left: position,
              width: tileWidth
            }}
            title={formatTimecode(sec)}
          >
            {dataUrl ? (
              <img
                src={dataUrl}
                alt={`t=${nearestSecond}s`}
                className="w-full h-full object-cover opacity-90"
              />
            ) : serverUrl ? (
              <img
                src={serverUrl}
                alt={`t=${nearestSecond}s`}
                className="w-full h-full object-cover opacity-90"
                loading="lazy"
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

  // console.log('NLETimeline: About to render JSX')
  
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
              isDragging={isDragging !== null}
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
            {bookmarks.map((bookmark) => {
              // Use drag preview position if this bookmark is being dragged
              const isBeingDragged = draggedBookmarkId === bookmark.id && dragPreview
              const startTime = isBeingDragged ? dragPreview.startMs / 1000 : bookmark.startMs / 1000
              const endTime = isBeingDragged ? dragPreview.endMs / 1000 : bookmark.endMs / 1000
              const startPos = timeToPosition(startTime)
              const endPos = timeToPosition(endTime)
              const bookmarkWidth = Math.max(0, endPos - startPos)
              const minWidth = 20 // Minimum width for bookmark
              
              return (
                <div key={bookmark.id} className="absolute top-4 bottom-4 z-5">
                  {/* Bookmark Body - Draggable */}
                  <div
                    className={`absolute top-0 bottom-0 rounded cursor-move ${
                      bookmark.lockedById ? 'bg-red-600' : 'bg-blue-600'
                    } ${isBeingDragged ? 'opacity-60 border-2 border-yellow-400' : 'opacity-80 hover:opacity-100'} transition-opacity`}
                    style={{
                      left: startPos,
                      width: Math.max(minWidth, bookmarkWidth),
                      right: bookmarkWidth < minWidth ? startPos + minWidth : undefined
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'bookmark-body', bookmark.id)}
                    title={`${bookmark.label || 'Untitled'} - ${formatTimecode(startTime)} → ${formatTimecode(endTime)}`}
                  >
                    <div className="p-1 text-xs truncate text-white">
                      {bookmark.label || 'Untitled'}
                    </div>
                  </div>

                  {/* Left Handle - Resize Start */}
                  <div
                    className="absolute top-0 bottom-0 w-2 bg-green-500 cursor-ew-resize z-10 opacity-0 hover:opacity-100 transition-opacity"
                    style={{ left: Math.max(0, startPos - 1) }}
                    onMouseDown={(e) => handleMouseDown(e, 'bookmark-start', bookmark.id)}
                    title={`Adjust start time: ${formatTimecode(startTime)}`}
                  >
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-4 bg-white rounded" />
                  </div>

                  {/* Right Handle - Resize End */}
                  <div
                    className="absolute top-0 bottom-0 w-2 bg-red-500 cursor-ew-resize z-10 opacity-0 hover:opacity-100 transition-opacity"
                    style={{ left: Math.max(0, endPos - 1) }}
                    onMouseDown={(e) => handleMouseDown(e, 'bookmark-end', bookmark.id)}
                    title={`Adjust end time: ${formatTimecode(endTime)}`}
                  >
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-4 bg-white rounded" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Timeline Instructions */}
        <div className="p-2 bg-gray-700 text-xs text-gray-300">
          <div className="flex justify-between">
            <span>Click to seek • Ctrl/Cmd+Click to set IN • Shift+Click to set OUT • Drag bookmark handles to resize • Drag bookmark body to move</span>
            <div className="flex items-center space-x-2">
              <span>{bookmarks.length} bookmarks</span>
              {videoElement && framePreviews.size === 0 && (
                <span className="text-blue-400">Generating thumbnails...</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Simple Name Prompt Modal */}
      {showNamePrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Clip</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter a name for your clip:
            </p>
            <input
              type="text"
              value={clipName}
              onChange={(e) => setClipName(e.target.value)}
              placeholder="e.g., Important Scene"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleNamePromptSubmit()
                } else if (e.key === 'Escape') {
                  handleNamePromptCancel()
                }
              }}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleNamePromptCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleNamePromptSubmit}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Create Clip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
