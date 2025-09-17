import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi } from 'vitest'
import ClipPreviewModal from '@/components/ClipPreviewModal'

// Mock video element methods
const mockVideoElement = {
  play: vi.fn(),
  pause: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  duration: 10,
  currentTime: 0,
  muted: true,
  src: '',
  preload: '',
}

// Mock HTMLVideoElement
Object.defineProperty(HTMLVideoElement.prototype, 'play', {
  writable: true,
  value: mockVideoElement.play,
})

Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
  writable: true,
  value: mockVideoElement.pause,
})

Object.defineProperty(HTMLVideoElement.prototype, 'addEventListener', {
  writable: true,
  value: mockVideoElement.addEventListener,
})

Object.defineProperty(HTMLVideoElement.prototype, 'removeEventListener', {
  writable: true,
  value: mockVideoElement.removeEventListener,
})

describe('ClipPreviewModal', () => {
  const mockBookmark = {
    id: 'bookmark-1',
    label: 'Test Clip',
    startMs: 5000,
    endMs: 10000,
    publicNotes: 'Test public notes',
    privateNotes: 'Test private notes',
  }

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    bookmark: mockBookmark,
    workspaceId: 'workspace-1',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render when open', () => {
    render(<ClipPreviewModal {...defaultProps} />)
    
    expect(screen.getByText('Test Clip')).toBeInTheDocument()
    expect(screen.getByText('Duration: 0:05 | Range: 0:05 - 0:10')).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(<ClipPreviewModal {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByText('Test Clip')).not.toBeInTheDocument()
  })

  it('should display bookmark details correctly', () => {
    render(<ClipPreviewModal {...defaultProps} />)
    
    expect(screen.getByText('Test Clip')).toBeInTheDocument()
    expect(screen.getByText('Duration: 0:05 | Range: 0:05 - 0:10')).toBeInTheDocument()
    expect(screen.getByText('Test public notes')).toBeInTheDocument()
    expect(screen.getByText('Test private notes')).toBeInTheDocument()
  })

  it('should handle bookmark without label', () => {
    const bookmarkWithoutLabel = { ...mockBookmark, label: null }
    render(<ClipPreviewModal {...defaultProps} bookmark={bookmarkWithoutLabel} />)
    
    expect(screen.getByText('Untitled Clip')).toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<ClipPreviewModal {...defaultProps} onClose={onClose} />)
    
    const closeButton = screen.getByRole('button')
    fireEvent.click(closeButton)
    
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should render video element with correct src', () => {
    render(<ClipPreviewModal {...defaultProps} />)
    
    const video = document.querySelector('video')
    expect(video).toHaveAttribute('src', '/api/workspaces/workspace-1/clips/bookmark-1/stream')
    expect(video).toHaveAttribute('preload', 'metadata')
    expect(video).toHaveProperty('muted', true)
  })

  it('should show loading state initially', () => {
    render(<ClipPreviewModal {...defaultProps} />)
    
    expect(screen.getByText('Loading preview...')).toBeInTheDocument()
  })

  it('should format time correctly', () => {
    render(<ClipPreviewModal {...defaultProps} />)
    
    // Check that time formatting is correct
    expect(screen.getByText('Duration: 0:05 | Range: 0:05 - 0:10')).toBeInTheDocument()
  })

  it('should reset state when modal opens', () => {
    const { rerender } = render(<ClipPreviewModal {...defaultProps} isOpen={false} />)
    
    // Open modal
    rerender(<ClipPreviewModal {...defaultProps} isOpen={true} />)
    
    // Should show loading state initially
    expect(screen.getByText('Loading preview...')).toBeInTheDocument()
  })

  it('should not display notes sections when notes are empty', () => {
    const bookmarkWithoutNotes = {
      ...mockBookmark,
      publicNotes: null,
      privateNotes: null,
    }
    
    render(<ClipPreviewModal {...defaultProps} bookmark={bookmarkWithoutNotes} />)
    
    expect(screen.queryByText('Public Notes')).not.toBeInTheDocument()
    expect(screen.queryByText('Private Notes')).not.toBeInTheDocument()
  })

  it('should display only public notes when private notes are empty', () => {
    const bookmarkWithOnlyPublicNotes = {
      ...mockBookmark,
      privateNotes: null,
    }
    
    render(<ClipPreviewModal {...defaultProps} bookmark={bookmarkWithOnlyPublicNotes} />)
    
    expect(screen.getByText('Public Notes')).toBeInTheDocument()
    expect(screen.getByText('Test public notes')).toBeInTheDocument()
    expect(screen.queryByText('Private Notes')).not.toBeInTheDocument()
  })

  it('should display only private notes when public notes are empty', () => {
    const bookmarkWithOnlyPrivateNotes = {
      ...mockBookmark,
      publicNotes: null,
    }
    
    render(<ClipPreviewModal {...defaultProps} bookmark={bookmarkWithOnlyPrivateNotes} />)
    
    expect(screen.queryByText('Public Notes')).not.toBeInTheDocument()
    expect(screen.getByText('Private Notes')).toBeInTheDocument()
    expect(screen.getByText('Test private notes')).toBeInTheDocument()
  })
})
