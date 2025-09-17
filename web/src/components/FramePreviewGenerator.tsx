'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'

interface FramePreviewGeneratorProps {
  videoElement: HTMLVideoElement | null
  frameRate: number
  duration: number
  zoom: number
  scrollPosition: number
  containerWidth: number
  onFrameGenerated: (frameNumber: number, dataUrl: string) => void
  isDragging?: boolean // Disable generation during drag operations
}

export default function FramePreviewGenerator({
  videoElement,
  frameRate,
  duration,
  zoom,
  scrollPosition,
  containerWidth,
  onFrameGenerated,
  isDragging = false,
}: FramePreviewGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [generatedFrames, setGeneratedFrames] = useState<Set<number>>(new Set())
  const generatedFramesRef = useRef<Set<number>>(new Set())
  const [isGenerating, setIsGenerating] = useState(false)
  const effectRunRef = useRef<boolean>(false)

  useEffect(() => {
    if (!videoElement || !canvasRef.current || isDragging) return
    
    // Prevent running twice
    if (effectRunRef.current) {
      console.log('FramePreviewGenerator: Effect already ran, skipping')
      return
    }
    effectRunRef.current = true

    console.log('FramePreviewGenerator: Starting generation', {
      readyState: videoElement.readyState,
      videoWidth: videoElement.videoWidth,
      duration,
      zoom,
      scrollPosition,
      containerWidth,
      frameRate,
      isDragging,
      onFrameGeneratedRef: onFrameGenerated.toString().slice(0, 50) + '...'
    })

    // Wait for video to be ready
    const waitForVideoReady = () => {
      return new Promise<void>((resolve) => {
        if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
          console.log('FramePreviewGenerator: Video already ready')
          resolve()
        } else {
          console.log('FramePreviewGenerator: Waiting for video to be ready')
          const handleCanPlay = () => {
            videoElement.removeEventListener('canplay', handleCanPlay)
            videoElement.removeEventListener('loadeddata', handleCanPlay)
            console.log('FramePreviewGenerator: Video ready via event')
            resolve()
          }
          videoElement.addEventListener('canplay', handleCanPlay)
          videoElement.addEventListener('loadeddata', handleCanPlay)
        }
      })
    }

    const generateFramePreviews = async () => {
      try {
        await waitForVideoReady()
        
        setIsGenerating(true)
        
        // Calculate which frames we need to generate based on timeline display requirements
        const frameWidth = 4 // pixels per frame at zoom level 1
        const pixelsPerSecond = isFinite(frameRate * frameWidth * zoom) && frameRate * frameWidth * zoom > 0 ? frameRate * frameWidth * zoom : 1
        const targetTilePx = 96
        const rawSeconds = Math.max(0.25, targetTilePx / pixelsPerSecond)
        // snap to nice steps
        const steps = [0.25, 0.5, 1, 2, 5, 10, 30, 60]
        const secondsPerThumb = steps.reduce((prev, curr) => Math.abs(curr - rawSeconds) < Math.abs(prev - rawSeconds) ? curr : prev, steps[0])
        const stepSeconds = Math.max(1, Math.round(secondsPerThumb))
        
        // Calculate visible frame range based on scroll position and zoom
        const startSecond = Math.max(0, Math.floor(scrollPosition / pixelsPerSecond))
        const endSecond = Math.min(Math.ceil(duration), Math.ceil((scrollPosition + containerWidth) / pixelsPerSecond))
        
        console.log('FramePreviewGenerator: Frame calculation', {
          frameWidth,
          pixelsPerSecond,
          secondsPerThumb,
          stepSeconds,
          startSecond,
          endSecond,
          containerWidth,
          scrollPosition
        })
        
        const framesToGenerate: number[] = []
        for (let sec = Math.floor(startSecond); sec <= endSecond; sec += stepSeconds) {
          if (sec >= 0 && sec <= duration) {
            const nearestSecond = Math.max(0, Math.round(sec))
            const frameForCache = Math.floor(nearestSecond * frameRate)
            if (frameForCache >= 0 && frameForCache < duration * frameRate && !generatedFramesRef.current.has(frameForCache)) {
              framesToGenerate.push(frameForCache)
            }
          }
        }

        console.log('FramePreviewGenerator: Frames to generate', {
          count: framesToGenerate.length,
          frames: framesToGenerate.slice(0, 10) // Show first 10 for debugging
        })

        if (framesToGenerate.length === 0) {
          console.log('FramePreviewGenerator: No frames to generate')
          setIsGenerating(false)
          return
        }

        const canvas = canvasRef.current!
        const ctx = canvas.getContext('2d')!
        
        // Set canvas size for thumbnails
        canvas.width = 80
        canvas.height = 45

        // Store original time to restore later
        const originalTime = videoElement.currentTime

        // Generate thumbnails in batches to avoid blocking
        const batchSize = 5
        for (let i = 0; i < framesToGenerate.length; i += batchSize) {
          const batch = framesToGenerate.slice(i, i + batchSize)
          
          for (const frameNumber of batch) {
            try {
              const time = frameNumber / frameRate
              console.log(`FramePreviewGenerator: Generating frame ${frameNumber} at time ${time}`)
              
              // Seek to the frame time
              videoElement.currentTime = time
              
              // Wait for seek to complete with timeout
              await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                  videoElement.removeEventListener('seeked', handleSeeked)
                  reject(new Error('Seek timeout'))
                }, 2000)
                
                const handleSeeked = () => {
                  clearTimeout(timeout)
                  videoElement.removeEventListener('seeked', handleSeeked)
                  resolve()
                }
                
                videoElement.addEventListener('seeked', handleSeeked)
                
                // If already at the correct time, resolve immediately
                if (Math.abs(videoElement.currentTime - time) < 0.1) {
                  clearTimeout(timeout)
                  videoElement.removeEventListener('seeked', handleSeeked)
                  resolve()
                }
              })

              // Small delay to ensure frame is rendered
              await new Promise(resolve => setTimeout(resolve, 100))

              // Draw the current frame to canvas
              ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
              
              // Convert to data URL
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
              
              console.log(`FramePreviewGenerator: Generated frame ${frameNumber}, dataUrl length: ${dataUrl.length}`)
              
              // Notify parent component
              onFrameGenerated(frameNumber, dataUrl)
              
              // Mark as generated in both state and ref
              setGeneratedFrames(prev => new Set([...prev, frameNumber]))
              generatedFramesRef.current.add(frameNumber)
              
            } catch (error) {
              console.error(`Failed to generate frame ${frameNumber}:`, error)
            }
          }
          
          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        // Restore original time
        videoElement.currentTime = originalTime
        setIsGenerating(false)
        
      } catch (error) {
        console.error('Error generating frame previews:', error)
        setIsGenerating(false)
      }
    }

    // Debounce the generation to avoid excessive seeking
    const timeoutId = setTimeout(generateFramePreviews, 1000)
    return () => clearTimeout(timeoutId)
  }, [videoElement, frameRate, duration, zoom, scrollPosition, containerWidth, onFrameGenerated, isDragging])

  return (
    <canvas
      ref={canvasRef}
      className="hidden"
      width={80}
      height={45}
    />
  )
}

// Hook for managing frame previews
export function useFramePreviews() {
  const [framePreviews, setFramePreviews] = useState<Map<number, string>>(new Map())

  const addFramePreview = useCallback((frameNumber: number, dataUrl: string) => {
    setFramePreviews(prev => new Map(prev).set(frameNumber, dataUrl))
  }, [])

  const getFramePreview = useCallback((frameNumber: number): string | null => {
    return framePreviews.get(frameNumber) || null
  }, [framePreviews])

  const clearFramePreviews = useCallback(() => {
    setFramePreviews(new Map())
  }, [])

  return {
    framePreviews,
    addFramePreview,
    getFramePreview,
    clearFramePreviews
  }
}
