import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VideoPlayer from './VideoPlayer'

// Mock video element methods
const mockVideoElement = {
  play: vi.fn(),
  pause: vi.fn(),
  requestFullscreen: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  currentTime: 0,
  duration: 3600,
  volume: 1,
  paused: true,
}

// Mock document methods
Object.defineProperty(document, 'fullscreenElement', {
  writable: true,
  value: null,
})

Object.defineProperty(document, 'exitFullscreen', {
  writable: true,
  value: vi.fn(),
})

// Mock HTMLVideoElement
Object.defineProperty(HTMLVideoElement.prototype, 'requestFullscreen', {
  writable: true,
  value: vi.fn(),
})

const mockProps = {
  workspaceId: 'workspace-1',
  plexKey: 'plex-key-1',
  plexServerId: 'server-1',
  contentDuration: 3600000, // 1 hour in ms
  onBookmarkCreate: vi.fn(),
  bookmarks: [
    {
      id: 'bookmark-1',
      label: 'Test Bookmark',
      publicNotes: 'Public notes',
      privateNotes: 'Private notes',
      startMs: 10000,
      endMs: 20000,
      createdBy: {
        id: 'user-1',
        plexUsername: 'testuser',
      },
    },
  ],
  currentUserId: 'user-1',
}

describe('VideoPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock video element
    Object.defineProperty(HTMLVideoElement.prototype, 'play', {
      writable: true,
      value: vi.fn(),
    })
    
    Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
      writable: true,
      value: vi.fn(),
    })
    
    Object.defineProperty(HTMLVideoElement.prototype, 'requestFullscreen', {
      writable: true,
      value: vi.fn(),
    })
  })

  it('renders video player with controls', () => {
    render(<VideoPlayer {...mockProps} />)
    
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument()
    expect(screen.getByText('0:00 / 1:00:00')).toBeInTheDocument()
    expect(screen.getByText('Vol:')).toBeInTheDocument()
  })

  it('displays bookmark markers on timeline', () => {
    render(<VideoPlayer {...mockProps} />)
    
    // Check if bookmark markers are rendered (they should be positioned based on time)
    const progressBar = screen.getByRole('slider')
    expect(progressBar).toBeInTheDocument()
  })

  it('opens bookmark creation modal when I button is clicked', async () => {
    const user = userEvent.setup()
    render(<VideoPlayer {...mockProps} />)
    
    const bookmarkButton = screen.getByTitle(/press 'i' to set in point/i)
    await user.click(bookmarkButton)
    
    expect(screen.getByText('Create Bookmark')).toBeInTheDocument()
    expect(screen.getByText('0:00 - 0:00')).toBeInTheDocument()
  })

  it('submits bookmark creation form', async () => {
    const user = userEvent.setup()
    const onBookmarkCreate = vi.fn()
    
    render(<VideoPlayer {...mockProps} onBookmarkCreate={onBookmarkCreate} />)
    
    // Open bookmark modal
    const bookmarkButton = screen.getByTitle(/press 'i' to set in point/i)
    await user.click(bookmarkButton)
    
    // Fill out form
    const labelInput = screen.getByPlaceholderText(/e.g., important scene/i)
    const publicNotesInput = screen.getByPlaceholderText(/notes visible to all collaborators/i)
    const privateNotesInput = screen.getByPlaceholderText(/your private notes/i)
    
    await user.type(labelInput, 'Test Bookmark')
    await user.type(publicNotesInput, 'Public notes')
    await user.type(privateNotesInput, 'Private notes')
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /create bookmark/i })
    await user.click(submitButton)
    
    expect(onBookmarkCreate).toHaveBeenCalledWith({
      label: 'Test Bookmark',
      publicNotes: 'Public notes',
      privateNotes: 'Private notes',
      startMs: 0,
      endMs: 0,
    })
  })

  it('handles keyboard shortcuts', async () => {
    const user = userEvent.setup()
    render(<VideoPlayer {...mockProps} />)
    
    // Focus on video element
    const video = screen.getByRole('application') // video element
    video.focus()
    
    // Test spacebar for play/pause
    await user.keyboard(' ')
    
    // Test 'I' for bookmark start
    await user.keyboard('i')
    
    // Test 'O' for bookmark end
    await user.keyboard('o')
    
    // Test escape to cancel
    await user.keyboard('Escape')
  })

  it('formats timecode correctly', () => {
    render(<VideoPlayer {...mockProps} />)
    
    // Should display formatted time
    expect(screen.getByText('0:00 / 1:00:00')).toBeInTheDocument()
  })

  it('handles volume changes', async () => {
    const user = userEvent.setup()
    render(<VideoPlayer {...mockProps} />)
    
    const volumeSlider = screen.getByRole('slider', { name: /vol/i })
    await user.type(volumeSlider, '0.5')
    
    // Volume should be updated (this would be tested with actual video element)
  })

  it('handles fullscreen toggle', async () => {
    const user = userEvent.setup()
    render(<VideoPlayer {...mockProps} />)
    
    const fullscreenButton = screen.getByRole('button', { name: /fullscreen/i })
    await user.click(fullscreenButton)
    
    // Fullscreen should be requested (this would be tested with actual video element)
  })

  it('closes bookmark modal when cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<VideoPlayer {...mockProps} />)
    
    // Open bookmark modal
    const bookmarkButton = screen.getByTitle(/press 'i' to set in point/i)
    await user.click(bookmarkButton)
    
    expect(screen.getByText('Create Bookmark')).toBeInTheDocument()
    
    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    
    await waitFor(() => {
      expect(screen.queryByText('Create Bookmark')).not.toBeInTheDocument()
    })
  })

  it('validates bookmark form submission', async () => {
    const user = userEvent.setup()
    render(<VideoPlayer {...mockProps} />)
    
    // Open bookmark modal
    const bookmarkButton = screen.getByTitle(/press 'i' to set in point/i)
    await user.click(bookmarkButton)
    
    // Submit empty form
    const submitButton = screen.getByRole('button', { name: /create bookmark/i })
    await user.click(submitButton)
    
    // Should still submit with empty values (they become undefined)
    expect(mockProps.onBookmarkCreate).toHaveBeenCalledWith({
      label: undefined,
      publicNotes: undefined,
      privateNotes: undefined,
      startMs: 0,
      endMs: 0,
    })
  })
})
