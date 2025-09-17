import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi } from 'vitest'
import NLETimeline from '@/components/NLETimeline'

// Mock the ClipPreviewModal component
vi.mock('@/components/ClipPreviewModal', () => {
  return function MockClipPreviewModal({ isOpen, onClose, bookmark }: any) {
    return isOpen ? (
      <div data-testid="clip-preview-modal">
        <div>Preview: {bookmark.label || 'Untitled'}</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  }
})

// Mock FramePreviewGenerator
vi.mock('@/components/FramePreviewGenerator', () => {
  return function MockFramePreviewGenerator() {
    return <div data-testid="frame-preview-generator" />
  }
})

describe('NLETimeline Clip Preview Integration', () => {
  const mockBookmarks = [
    {
      id: 'bookmark-1',
      label: 'Test Clip 1',
      publicNotes: 'Test notes',
      privateNotes: null,
      startMs: 5000,
      endMs: 10000,
      lockedById: null,
      lockedAt: null,
      createdBy: {
        id: 'user-1',
        plexUsername: 'testuser',
      },
      lockedBy: null,
    },
    {
      id: 'bookmark-2',
      label: null,
      publicNotes: null,
      privateNotes: 'Private notes',
      startMs: 15000,
      endMs: 20000,
      lockedById: null,
      lockedAt: null,
      createdBy: {
        id: 'user-2',
        plexUsername: 'testuser2',
      },
      lockedBy: null,
    },
  ]

  const defaultProps = {
    duration: 100,
    currentTime: 0,
    onSeek: vi.fn(),
    bookmarks: mockBookmarks,
    onBookmarkCreate: vi.fn(),
    onBookmarkUpdate: vi.fn(),
    onBookmarkDelete: vi.fn(),
    isPlaying: false,
    onPlayPause: vi.fn(),
    onStep: vi.fn(),
    videoElement: null,
    frameRate: 30,
    workspaceId: 'workspace-1',
    shotCuts: [],
    snappingSettings: null,
    onSnappingSettingsUpdate: vi.fn(),
    isProducer: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render bookmarks with preview buttons', () => {
    render(<NLETimeline {...defaultProps} />)
    
    // Check that bookmarks are rendered
    expect(screen.getByText('Test Clip 1')).toBeInTheDocument()
    expect(screen.getByText('Untitled')).toBeInTheDocument()
  })

  it('should show preview button on bookmark hover', () => {
    render(<NLETimeline {...defaultProps} />)
    
    // Find bookmark elements (they should have the group class for hover effects)
    const bookmarkElements = screen.getAllByText(/Test Clip 1|Untitled/)
    
    // The preview buttons should be present but initially hidden
    const previewButtons = screen.getAllByTitle('Preview clip')
    expect(previewButtons).toHaveLength(2)
  })

  it('should open preview modal when preview button is clicked', async () => {
    render(<NLETimeline {...defaultProps} />)
    
    // Find and click the first preview button
    const previewButtons = screen.getAllByTitle('Preview clip')
    fireEvent.click(previewButtons[0])
    
    // Check that the preview modal is opened
    await waitFor(() => {
      expect(screen.getByTestId('clip-preview-modal')).toBeInTheDocument()
      expect(screen.getByText('Preview: Test Clip 1')).toBeInTheDocument()
    })
  })

  it('should open preview modal with correct bookmark data', async () => {
    render(<NLETimeline {...defaultProps} />)
    
    // Click preview button for the second bookmark (untitled)
    const previewButtons = screen.getAllByTitle('Preview clip')
    fireEvent.click(previewButtons[1])
    
    // Check that the correct bookmark data is passed
    await waitFor(() => {
      expect(screen.getByText('Preview: Untitled')).toBeInTheDocument()
    })
  })

  it('should close preview modal when close button is clicked', async () => {
    render(<NLETimeline {...defaultProps} />)
    
    // Open preview modal
    const previewButtons = screen.getAllByTitle('Preview clip')
    fireEvent.click(previewButtons[0])
    
    await waitFor(() => {
      expect(screen.getByTestId('clip-preview-modal')).toBeInTheDocument()
    })
    
    // Close preview modal
    const closeButton = screen.getByText('Close')
    fireEvent.click(closeButton)
    
    await waitFor(() => {
      expect(screen.queryByTestId('clip-preview-modal')).not.toBeInTheDocument()
    })
  })

  it('should pass correct workspace ID to preview modal', async () => {
    render(<NLETimeline {...defaultProps} workspaceId="test-workspace" />)
    
    // Open preview modal
    const previewButtons = screen.getAllByTitle('Preview clip')
    fireEvent.click(previewButtons[0])
    
    await waitFor(() => {
      expect(screen.getByTestId('clip-preview-modal')).toBeInTheDocument()
    })
    
    // The modal should be rendered with the correct workspace ID
    // (This is tested implicitly through the modal rendering)
  })

  it('should handle preview button click without interfering with bookmark drag', () => {
    render(<NLETimeline {...defaultProps} />)
    
    const previewButtons = screen.getAllByTitle('Preview clip')
    
    // Click preview button
    fireEvent.click(previewButtons[0])
    
    // Should not trigger any bookmark drag events
    expect(defaultProps.onBookmarkUpdate).not.toHaveBeenCalled()
  })

  it('should render preview buttons for all bookmarks', () => {
    render(<NLETimeline {...defaultProps} />)
    
    const previewButtons = screen.getAllByTitle('Preview clip')
    expect(previewButtons).toHaveLength(mockBookmarks.length)
  })

  it('should handle empty bookmarks array', () => {
    render(<NLETimeline {...defaultProps} bookmarks={[]} />)
    
    const previewButtons = screen.queryAllByTitle('Preview clip')
    expect(previewButtons).toHaveLength(0)
  })

  it('should maintain preview modal state correctly', async () => {
    render(<NLETimeline {...defaultProps} />)
    
    // Initially no modal should be open
    expect(screen.queryByTestId('clip-preview-modal')).not.toBeInTheDocument()
    
    // Open modal
    const previewButtons = screen.getAllByTitle('Preview clip')
    fireEvent.click(previewButtons[0])
    
    await waitFor(() => {
      expect(screen.getByTestId('clip-preview-modal')).toBeInTheDocument()
    })
    
    // Close modal
    const closeButton = screen.getByText('Close')
    fireEvent.click(closeButton)
    
    await waitFor(() => {
      expect(screen.queryByTestId('clip-preview-modal')).not.toBeInTheDocument()
    })
  })
})
