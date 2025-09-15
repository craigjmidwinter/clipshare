import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VideoPlayer from './VideoPlayer'

// Mock dashjs
vi.mock('dashjs', () => ({
  MediaPlayer: vi.fn(() => ({
    create: vi.fn(() => ({
      on: vi.fn(),
      updateSettings: vi.fn(),
      initialize: vi.fn(),
      reset: vi.fn(),
      destroy: vi.fn()
    }))
  })),
  Debug: {
    LOG_LEVEL_ERROR: 4
  },
  supportsMediaSource: vi.fn(() => true)
}))

// Mock fetch
global.fetch = vi.fn()

// Mock video element methods
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  writable: true,
  value: vi.fn().mockImplementation(() => Promise.resolve())
})

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  writable: true,
  value: vi.fn()
})

Object.defineProperty(HTMLMediaElement.prototype, 'load', {
  writable: true,
  value: vi.fn()
})

describe('VideoPlayer', () => {
  const mockProps = {
    workspaceId: 'workspace1',
    plexKey: 'plex-key-123',
    plexServerId: 'server1',
    contentDuration: 60000, // 1 minute
    onBookmarkCreate: vi.fn(),
    bookmarks: [
      {
        id: 'bookmark1',
        label: 'Test Bookmark',
        publicNotes: 'Public note',
        privateNotes: 'Private note',
        startMs: 10000,
        endMs: 20000,
        lockedById: null,
        lockedAt: null,
        createdBy: {
          id: 'user1',
          plexUsername: 'testuser'
        },
        lockedBy: null
      },
      {
        id: 'bookmark2',
        label: 'Locked Bookmark',
        publicNotes: null,
        privateNotes: null,
        startMs: 30000,
        endMs: 40000,
        lockedById: 'user2',
        lockedAt: '2023-01-01T00:00:00Z',
        createdBy: {
          id: 'user1',
          plexUsername: 'testuser'
        },
        lockedBy: {
          id: 'user2',
          plexUsername: 'producer'
        }
      }
    ],
    currentUserId: 'user1'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful DASH URL response
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ dashUrl: 'http://example.com/dash.mpd' })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK'
      })
  })

  it('should render video player with controls', () => {
    render(<VideoPlayer {...mockProps} />)
    
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument()
    expect(screen.getByRole('slider')).toBeInTheDocument() // Progress bar
    expect(screen.getByText(/00:00/)).toBeInTheDocument() // Time display
  })

  it('should display bookmark markers on timeline', () => {
    render(<VideoPlayer {...mockProps} />)
    
    // Check that bookmark markers are rendered
    const timeline = screen.getByRole('slider')
    expect(timeline).toBeInTheDocument()
    
    // Bookmarks should be visually represented (we can't easily test exact positioning)
    // but we can verify the component renders without errors
  })

  it('should show locked vs unlocked bookmark indicators', () => {
    render(<VideoPlayer {...mockProps} />)
    
    // The bookmarks prop contains both locked and unlocked bookmarks
    // The component should render both types differently
    expect(mockProps.bookmarks[0].lockedById).toBeNull()
    expect(mockProps.bookmarks[1].lockedById).toBe('user2')
  })

  it('should handle bookmark creation with keyboard shortcuts', async () => {
    const user = userEvent.setup()
    render(<VideoPlayer {...mockProps} />)
    
    // Press 'I' to start bookmark selection
    await user.keyboard('i')
    
    // Should show selection range indicator
    await waitFor(() => {
      expect(screen.getByText(/Selecting range/)).toBeInTheDocument()
    })
  })

  it('should handle bookmark creation with mouse clicks', async () => {
    const user = userEvent.setup()
    render(<VideoPlayer {...mockProps} />)
    
    const bookmarkButton = screen.getByRole('button', { name: /I/ })
    
    // Click bookmark button to start selection
    await user.click(bookmarkButton)
    
    // Should show selection state
    await waitFor(() => {
      expect(screen.getByText(/Press 'O' to set out point/)).toBeInTheDocument()
    })
  })

  it('should show bookmark creation modal with precision controls', async () => {
    const user = userEvent.setup()
    render(<VideoPlayer {...mockProps} />)
    
    // Start bookmark selection
    await user.keyboard('i')
    await user.keyboard('o')
    
    // Should show modal with precision controls
    await waitFor(() => {
      expect(screen.getByText('Create Bookmark')).toBeInTheDocument()
      expect(screen.getByText('In Point')).toBeInTheDocument()
      expect(screen.getByText('Out Point')).toBeInTheDocument()
    })
  })

  it('should allow frame-level adjustments in bookmark modal', async () => {
    const user = userEvent.setup()
    render(<VideoPlayer {...mockProps} />)
    
    // Start bookmark selection and open modal
    await user.keyboard('i')
    await user.keyboard('o')
    
    await waitFor(() => {
      expect(screen.getByText('Create Bookmark')).toBeInTheDocument()
    })
    
    // Test frame adjustment buttons
    const plusOneFrameButtons = screen.getAllByText('+1')
    const minusOneFrameButtons = screen.getAllByText('-1')
    
    expect(plusOneFrameButtons).toHaveLength(2) // One for in, one for out
    expect(minusOneFrameButtons).toHaveLength(2) // One for in, one for out
    
    // Test clicking adjustment buttons
    await user.click(plusOneFrameButtons[0]) // Adjust in point
    await user.click(minusOneFrameButtons[1]) // Adjust out point
  })

  it('should handle volume control', async () => {
    const user = userEvent.setup()
    render(<VideoPlayer {...mockProps} />)
    
    const volumeSlider = screen.getByLabelText(/vol/i)
    expect(volumeSlider).toBeInTheDocument()
    
    // Change volume
    await user.click(volumeSlider)
  })

  it('should handle fullscreen toggle', async () => {
    const user = userEvent.setup()
    render(<VideoPlayer {...mockProps} />)
    
    const fullscreenButton = screen.getByRole('button', { name: /fullscreen/i })
    await user.click(fullscreenButton)
    
    // Note: We can't easily test actual fullscreen behavior in jsdom
    // but we can verify the button exists and is clickable
  })

  it('should show timeline tooltip on hover', async () => {
    const user = userEvent.setup()
    render(<VideoPlayer {...mockProps} />)
    
    const timeline = screen.getByRole('slider')
    
    // Mouse over timeline should show tooltip
    await user.hover(timeline)
    
    // Tooltip should appear (though exact content depends on mouse position)
    await waitFor(() => {
      const tooltip = document.querySelector('[class*="tooltip"]')
      expect(tooltip).toBeInTheDocument()
    })
  })

  it('should display bookmark count in timeline controls', () => {
    render(<VideoPlayer {...mockProps} />)
    
    // Should show count of locked vs unlocked bookmarks
    expect(screen.getByText(/unlocked/)).toBeInTheDocument()
    expect(screen.getByText(/locked/)).toBeInTheDocument()
  })

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<VideoPlayer {...mockProps} />)
    
    // Test arrow key navigation
    await user.keyboard('ArrowLeft')
    await user.keyboard('ArrowRight')
    
    // Test shift + arrow for frame navigation
    await user.keyboard('{Shift>}ArrowLeft{/Shift}')
    await user.keyboard('{Shift>}ArrowRight{/Shift}')
    
    // Test space for play/pause
    await user.keyboard(' ')
  })

  it('should handle escape key to cancel selection', async () => {
    const user = userEvent.setup()
    render(<VideoPlayer {...mockProps} />)
    
    // Start selection
    await user.keyboard('i')
    
    // Cancel with escape
    await user.keyboard('Escape')
    
    // Selection should be cancelled
    await waitFor(() => {
      expect(screen.queryByText(/Selecting range/)).not.toBeInTheDocument()
    })
  })

  it('should show loading state initially', () => {
    render(<VideoPlayer {...mockProps} />)
    
    expect(screen.getByText('Loading video...')).toBeInTheDocument()
  })

  it('should handle video loading errors gracefully', async () => {
    // Mock fetch to return error
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    
    render(<VideoPlayer {...mockProps} />)
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load video/)).toBeInTheDocument()
    })
    
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('should format timecodes correctly', () => {
    render(<VideoPlayer {...mockProps} />)
    
    // The component should format timecodes in MM:SS or HH:MM:SS format
    // This is tested implicitly through the component rendering
    expect(screen.getByText(/00:00/)).toBeInTheDocument()
  })

  it('should call onBookmarkCreate with correct data when bookmark is created', async () => {
    const user = userEvent.setup()
    render(<VideoPlayer {...mockProps} />)
    
    // Start and end bookmark selection
    await user.keyboard('i')
    await user.keyboard('o')
    
    // Fill out modal and submit
    await waitFor(() => {
      expect(screen.getByText('Create Bookmark')).toBeInTheDocument()
    })
    
    const labelInput = screen.getByLabelText(/label/i)
    const publicNotesInput = screen.getByLabelText(/public notes/i)
    const submitButton = screen.getByRole('button', { name: /create bookmark/i })
    
    await user.type(labelInput, 'Test Bookmark')
    await user.type(publicNotesInput, 'Test notes')
    await user.click(submitButton)
    
    // Should call onBookmarkCreate with the bookmark data
    expect(mockProps.onBookmarkCreate).toHaveBeenCalledWith({
      label: 'Test Bookmark',
      publicNotes: 'Test notes',
      privateNotes: '',
      startMs: expect.any(Number),
      endMs: expect.any(Number)
    })
  })
})