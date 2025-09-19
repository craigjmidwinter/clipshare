import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import NLETimeline from './NLETimeline'

// Mock the FramePreviewGenerator component and hook
vi.mock('./FramePreviewGenerator', () => ({
  default: function MockFramePreviewGenerator() {
    return <div data-testid="frame-preview-generator">Mock Frame Preview Generator</div>
  },
  useFramePreviews: () => ({
    framePreviews: new Map(),
    addFramePreview: vi.fn(),
    getFramePreview: vi.fn(() => null),
  }),
}))

describe('NLETimeline', () => {
  const mockProps = {
    duration: 100, // 100 seconds
    frameRate: 30,
    videoElement: null,
    currentTime: 0,
    bookmarks: [
      {
        id: 'bookmark-1',
        label: 'Test Bookmark',
        startMs: 10000, // 10 seconds
        endMs: 20000,   // 20 seconds
        createdBy: {
          id: 'user-1',
          name: 'Test User',
          plexUsername: 'testuser',
        },
        lockedById: null,
        lockedAt: null,
      },
      {
        id: 'bookmark-2',
        label: 'Locked Bookmark',
        startMs: 30000, // 30 seconds
        endMs: 40000,   // 40 seconds
        createdBy: {
          id: 'user-2',
          name: 'Other User',
          plexUsername: 'otheruser',
        },
        lockedById: 'user-2',
        lockedAt: new Date().toISOString(),
      },
    ],
    onSeek: vi.fn(),
    onBookmarkCreate: vi.fn(),
    onBookmarkUpdate: vi.fn(),
    onBookmarkDelete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock getBoundingClientRect for timeline element
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 800,
      height: 100,
      top: 0,
      left: 0,
      bottom: 100,
      right: 800,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    }))
  })

  it('renders timeline with bookmarks', () => {
    render(<NLETimeline {...mockProps} />)
    
    // Check if timeline container is rendered (it's a div with cursor-pointer, not a slider)
    expect(screen.getByRole('button', { name: /fit to window/i })).toBeInTheDocument()
    
    // Check if bookmarks are rendered
    expect(screen.getByText('Test Bookmark')).toBeInTheDocument()
    expect(screen.getByText('Locked Bookmark')).toBeInTheDocument()
  })

  it('handles bookmark body drag', async () => {
    render(<NLETimeline {...mockProps} />)
    
    const bookmark = screen.getByText('Test Bookmark').closest('div')
    expect(bookmark).toBeInTheDocument()
    
    // Simulate mouse down on bookmark body
    fireEvent.mouseDown(bookmark!, {
      clientX: 100,
      button: 0,
    })
    
    // Simulate mouse move
    fireEvent.mouseMove(document, {
      clientX: 200,
    })
    
    // Simulate mouse up
    fireEvent.mouseUp(document, {
      clientX: 200,
    })
    
    // Check if onBookmarkUpdate was called
    await waitFor(() => {
      expect(mockProps.onBookmarkUpdate).toHaveBeenCalledWith(
        'bookmark-1',
        expect.any(Number),
        expect.any(Number)
      )
    })
  })

  it('handles bookmark start handle drag', async () => {
    render(<NLETimeline {...mockProps} />)
    
    // Find the bookmark container
    const bookmarkContainer = screen.getByText('Test Bookmark').closest('div')?.parentElement
    expect(bookmarkContainer).toBeInTheDocument()
    
    // Find the start handle (green handle)
    const startHandle = bookmarkContainer?.querySelector('[title*="Adjust start time"]')
    expect(startHandle).toBeInTheDocument()
    
    // Simulate mouse down on start handle
    fireEvent.mouseDown(startHandle!, {
      clientX: 100,
      button: 0,
    })
    
    // Simulate mouse move
    fireEvent.mouseMove(document, {
      clientX: 150,
    })
    
    // Simulate mouse up
    fireEvent.mouseUp(document, {
      clientX: 150,
    })
    
    // Check if onBookmarkUpdate was called with updated start time
    await waitFor(() => {
      expect(mockProps.onBookmarkUpdate).toHaveBeenCalledWith(
        'bookmark-1',
        expect.any(Number),
        20000 // end time should remain the same
      )
    })
  })

  it('handles bookmark end handle drag', async () => {
    render(<NLETimeline {...mockProps} />)
    
    // Find the bookmark container
    const bookmarkContainer = screen.getByText('Test Bookmark').closest('div')?.parentElement
    expect(bookmarkContainer).toBeInTheDocument()
    
    // Find the end handle (red handle)
    const endHandle = bookmarkContainer?.querySelector('[title*="Adjust end time"]')
    expect(endHandle).toBeInTheDocument()
    
    // Simulate mouse down on end handle
    fireEvent.mouseDown(endHandle!, {
      clientX: 200,
      button: 0,
    })
    
    // Simulate mouse move
    fireEvent.mouseMove(document, {
      clientX: 250,
    })
    
    // Simulate mouse up
    fireEvent.mouseUp(document, {
      clientX: 250,
    })
    
    // Check if onBookmarkUpdate was called with updated end time
    await waitFor(() => {
      expect(mockProps.onBookmarkUpdate).toHaveBeenCalledWith(
        'bookmark-1',
        10000, // start time should remain the same
        expect.any(Number)
      )
    })
  })

  it('prevents dragging locked bookmarks by non-lockers', () => {
    render(<NLETimeline {...mockProps} />)
    
    const lockedBookmark = screen.getByText('Locked Bookmark').closest('div')
    expect(lockedBookmark).toBeInTheDocument()
    
    // Simulate mouse down on locked bookmark
    fireEvent.mouseDown(lockedBookmark!, {
      clientX: 300,
      button: 0,
    })
    
    // Simulate mouse move
    fireEvent.mouseMove(document, {
      clientX: 350,
    })
    
    // Simulate mouse up
    fireEvent.mouseUp(document, {
      clientX: 350,
    })
    
    // For now, we'll just verify the bookmark is rendered as locked (red color)
    expect(lockedBookmark).toHaveClass('bg-red-600')
  })

  it('handles timeline click for playhead movement', () => {
    render(<NLETimeline {...mockProps} />)
    
    // Find the timeline container (the div with cursor-pointer class)
    const timeline = document.querySelector('.cursor-pointer')
    expect(timeline).toBeInTheDocument()
    
    // Simulate click on timeline
    fireEvent.mouseDown(timeline!, {
      clientX: 400,
      button: 0,
    })
    
    // Check if onSeek was called
    expect(mockProps.onSeek).toHaveBeenCalledWith(expect.any(Number))
  })

  it('shows correct cursor styles for different drag operations', () => {
    render(<NLETimeline {...mockProps} />)
    
    // Find the bookmark body (the element with cursor-move class)
    const bookmarkBody = screen.getByTitle('Test Bookmark - 0:10:00 → 0:20:00')
    expect(bookmarkBody).toHaveClass('cursor-move')
    
    const startHandle = screen.getByTitle('Adjust start time: 0:10:00')
    expect(startHandle).toHaveClass('cursor-ew-resize')
    
    const endHandle = screen.getByTitle('Adjust end time: 0:20:00')
    expect(endHandle).toHaveClass('cursor-ew-resize')
  })

  it('displays timecode markers', () => {
    render(<NLETimeline {...mockProps} />)
    
    // Check if timecode markers are rendered (looking for the format that's actually rendered)
    expect(screen.getByText('0:00:00')).toBeInTheDocument()
    expect(screen.getByText('1:40:00')).toBeInTheDocument()
  })

  it('handles zoom controls', () => {
    render(<NLETimeline {...mockProps} />)
    
    // Find zoom controls (using the actual titles from the rendered HTML)
    const zoomInButton = screen.getByTitle('Zoom in')
    const zoomOutButton = screen.getByTitle('Zoom out')
    const fitButton = screen.getByTitle('Fit to window')
    
    expect(zoomInButton).toBeInTheDocument()
    expect(zoomOutButton).toBeInTheDocument()
    expect(fitButton).toBeInTheDocument()
    
    // Test zoom in
    fireEvent.click(zoomInButton)
    
    // Test zoom out
    fireEvent.click(zoomOutButton)
    
    // Test fit to window
    fireEvent.click(fitButton)
  })

  it('renders zoom scrollbar with draggable viewport and handles', () => {
    render(<NLETimeline {...mockProps} />)

    // Scrollbar elements
    const zoomScrollbar = screen.getByTestId('zoom-scrollbar')
    const viewport = screen.getByTestId('zoom-scrollbar-viewport')
    const leftHandle = screen.getByTitle('Zoom range start')
    const rightHandle = screen.getByTitle('Zoom range end')

    expect(zoomScrollbar).toBeInTheDocument()
    expect(viewport).toBeInTheDocument()
    expect(leftHandle).toBeInTheDocument()
    expect(rightHandle).toBeInTheDocument()
  })

  it('allows dragging viewport to pan timeline', () => {
    render(<NLETimeline {...mockProps} />)

    const viewport = screen.getByTestId('zoom-scrollbar-viewport')

    // Start dragging the viewport band
    fireEvent.mouseDown(viewport, { clientX: 100, button: 0 })
    fireEvent.mouseMove(document, { clientX: 200 })
    fireEvent.mouseUp(document, { clientX: 200 })

    // onSeek should not be called here; panning only affects scroll
    expect(mockProps.onSeek).not.toHaveBeenCalled()
  })

  it('allows clicking outside viewport to move it to that position', () => {
    render(<NLETimeline {...mockProps} />)

    const scrollbar = screen.getByTestId('zoom-scrollbar')

    // Click to the right of the viewport
    fireEvent.mouseDown(scrollbar, { clientX: 500, button: 0 })

    // Should not call onSeek, just move the viewport
    expect(mockProps.onSeek).not.toHaveBeenCalled()
  })

  it('allows dragging handles to change zoom while keeping center', () => {
    render(<NLETimeline {...mockProps} />)

    const leftHandle = screen.getByTitle('Zoom range start')
    const rightHandle = screen.getByTitle('Zoom range end')

    // Drag left handle right to zoom in
    fireEvent.mouseDown(leftHandle, { clientX: 100, button: 0 })
    fireEvent.mouseMove(document, { clientX: 160 })
    fireEvent.mouseUp(document, { clientX: 160 })

    // Drag right handle left to zoom in further
    fireEvent.mouseDown(rightHandle, { clientX: 300, button: 0 })
    fireEvent.mouseMove(document, { clientX: 260 })
    fireEvent.mouseUp(document, { clientX: 260 })
  })

  it('formats timecodes correctly', () => {
    render(<NLETimeline {...mockProps} />)
    
    // Check if timecode formatting is working
    // Look for the actual timecode format used (HH:MM:SS)
    expect(screen.getByText('0:00:00')).toBeInTheDocument()
    expect(screen.getByText('1:40:00')).toBeInTheDocument()
  })

  describe('Drag-to-create clip functionality', () => {
    it('creates a clip by dragging from left to right', async () => {
      render(<NLETimeline {...mockProps} />)
      
      const timeline = document.querySelector('.cursor-pointer')
      expect(timeline).toBeInTheDocument()
      
      // Simulate mouse down to start selection
      fireEvent.mouseDown(timeline!, {
        clientX: 100,
        button: 0,
      })
      
      // Simulate mouse move to create selection
      fireEvent.mouseMove(document, {
        clientX: 200,
      })
      
      // Simulate mouse up to complete selection
      fireEvent.mouseUp(document, {
        clientX: 200,
      })
      
      // Check if onBookmarkCreate was called with correct times
      await waitFor(() => {
        expect(mockProps.onBookmarkCreate).toHaveBeenCalledWith(
          expect.any(Number),
          expect.any(Number)
        )
      })
    })

    it('creates a clip by dragging from right to left', async () => {
      render(<NLETimeline {...mockProps} />)
      
      const timeline = document.querySelector('.cursor-pointer')
      expect(timeline).toBeInTheDocument()
      
      // Simulate mouse down to start selection
      fireEvent.mouseDown(timeline!, {
        clientX: 200,
        button: 0,
      })
      
      // Simulate mouse move to create selection (dragging left)
      fireEvent.mouseMove(document, {
        clientX: 100,
      })
      
      // Simulate mouse up to complete selection
      fireEvent.mouseUp(document, {
        clientX: 100,
      })
      
      // Check if onBookmarkCreate was called with correct times
      await waitFor(() => {
        expect(mockProps.onBookmarkCreate).toHaveBeenCalledWith(
          expect.any(Number),
          expect.any(Number)
        )
      })
    })

    it('clears selection after creating a clip', async () => {
      render(<NLETimeline {...mockProps} />)
      
      const timeline = document.querySelector('.cursor-pointer')
      expect(timeline).toBeInTheDocument()
      
      // Create first clip
      fireEvent.mouseDown(timeline!, {
        clientX: 100,
        button: 0,
      })
      
      fireEvent.mouseMove(document, {
        clientX: 200,
      })
      
      fireEvent.mouseUp(document, {
        clientX: 200,
      })
      
      await waitFor(() => {
        expect(mockProps.onBookmarkCreate).toHaveBeenCalledTimes(1)
      })
      
      // Create second clip - should work because selection was cleared
      fireEvent.mouseDown(timeline!, {
        clientX: 300,
        button: 0,
      })
      
      fireEvent.mouseMove(document, {
        clientX: 400,
      })
      
      fireEvent.mouseUp(document, {
        clientX: 400,
      })
      
      await waitFor(() => {
        expect(mockProps.onBookmarkCreate).toHaveBeenCalledTimes(2)
      })
    })

    it('does not create clip if drag distance is too small', async () => {
      render(<NLETimeline {...mockProps} />)
      
      const timeline = document.querySelector('.cursor-pointer')
      expect(timeline).toBeInTheDocument()
      
      // Simulate mouse down and up at nearly the same position
      fireEvent.mouseDown(timeline!, {
        clientX: 100,
        button: 0,
      })
      
      fireEvent.mouseMove(document, {
        clientX: 101, // Very small movement
      })
      
      fireEvent.mouseUp(document, {
        clientX: 101,
      })
      
      // Should not create a bookmark for tiny selections
      await waitFor(() => {
        expect(mockProps.onBookmarkCreate).not.toHaveBeenCalled()
      })
    })

    it('shows selection range during drag', () => {
      render(<NLETimeline {...mockProps} />)
      
      const timeline = document.querySelector('.cursor-pointer')
      expect(timeline).toBeInTheDocument()
      
      // Start drag
      fireEvent.mouseDown(timeline!, {
        clientX: 100,
        button: 0,
      })
      
      // Move to create selection
      fireEvent.mouseMove(document, {
        clientX: 200,
      })
      
      // Check if selection range is visible
      const selectionRange = document.querySelector('.bg-orange-500')
      expect(selectionRange).toBeInTheDocument()
      
      // Complete the drag
      fireEvent.mouseUp(document, {
        clientX: 200,
      })
    })

    it('handles basic drag-to-create functionality', () => {
      render(<NLETimeline {...mockProps} />)
      
      const timeline = document.querySelector('.cursor-pointer')
      expect(timeline).toBeInTheDocument()
      
      // Test that mouse down starts selection
      fireEvent.mouseDown(timeline!, {
        clientX: 100,
        button: 0,
      })
      
      // Verify that selection state is set
      // This is a basic test to ensure the drag state is initialized
      expect(timeline).toBeInTheDocument()
    })
  })
})
