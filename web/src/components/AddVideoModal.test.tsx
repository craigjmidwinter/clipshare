import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AddVideoModal from '@/components/AddVideoModal'

// Mock fetch
global.fetch = vi.fn()

// Mock the VideoAccessControlModal component
vi.mock('@/components/VideoAccessControlModal', () => ({
  default: ({ isOpen, onClose, onConfirm, videoTitle }: any) => {
    if (!isOpen) return null
    return (
      <div data-testid="access-control-modal">
        <p>Access Control for: {videoTitle}</p>
        <button onClick={() => onConfirm(true, true)}>Confirm</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    )
  }
}))

describe('AddVideoModal', () => {
  const mockOnAddVideo = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetch).mockClear()
  })

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onAddVideo: mockOnAddVideo,
    workspaceId: 'test-workspace'
  }

  it('should render the modal when open', () => {
    render(<AddVideoModal {...defaultProps} />)
    
    expect(screen.getByText('Add Video to Workspace')).toBeInTheDocument()
    expect(screen.getByText('Upload File')).toBeInTheDocument()
    expect(screen.getByText('YouTube URL')).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(<AddVideoModal {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByText('Add Video to Workspace')).not.toBeInTheDocument()
  })

  it('should make title optional for YouTube videos', () => {
    render(<AddVideoModal {...defaultProps} />)
    
    // Switch to YouTube tab
    fireEvent.click(screen.getByText('YouTube URL'))
    
    const titleLabel = screen.getByText('Video Title')
    expect(titleLabel).toBeInTheDocument()
    expect(titleLabel.textContent).not.toContain('*')
    
    const titleInput = screen.getByPlaceholderText('Title will be auto-filled from YouTube video')
    expect(titleInput).toBeInTheDocument()
    expect(titleInput).not.toHaveAttribute('required')
  })

  it('should require title for upload videos', () => {
    render(<AddVideoModal {...defaultProps} />)
    
    // Stay on upload tab (default)
    const titleLabel = screen.getByText(/Video Title/)
    expect(titleLabel.textContent).toContain('*')
    
    const titleInput = screen.getByPlaceholderText('Enter video title')
    expect(titleInput).toHaveAttribute('required')
  })

  it('should fetch YouTube metadata when URL is entered', async () => {
    const mockMetadata = {
      success: true,
      metadata: {
        title: 'Test YouTube Video',
        description: 'Test description',
        duration: 120000,
        thumbnailUrl: 'https://example.com/thumb.jpg',
        uploader: 'Test Channel',
        uploadDate: '20240101',
        viewCount: 1000
      }
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve(mockMetadata)
    } as Response)

    render(<AddVideoModal {...defaultProps} />)
    
    // Switch to YouTube tab
    fireEvent.click(screen.getByText('YouTube URL'))
    
    // Enter YouTube URL
    const urlInput = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
    fireEvent.change(urlInput, { target: { value: 'https://www.youtube.com/watch?v=test' } })
    
    // Wait for debounced API call
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/youtube/metadata?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dtest')
    }, { timeout: 2000 })
    
    // Wait for metadata to be populated
    await waitFor(() => {
      const titleInput = screen.getByDisplayValue('Test YouTube Video')
      expect(titleInput).toBeInTheDocument()
    })
    
    const descriptionInput = screen.getByDisplayValue('Test description')
    expect(descriptionInput).toBeInTheDocument()
  })

  it('should show loading state while fetching metadata', async () => {
    // Mock a slow response
    vi.mocked(fetch).mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        json: () => Promise.resolve({ success: true, metadata: { title: 'Test' } })
      } as Response), 2000)) // Very slow response
    )

    render(<AddVideoModal {...defaultProps} />)
    
    // Switch to YouTube tab
    fireEvent.click(screen.getByText('YouTube URL'))
    
    // Enter YouTube URL
    const urlInput = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
    fireEvent.change(urlInput, { target: { value: 'https://www.youtube.com/watch?v=test' } })
    
    // Wait for debounce timeout (1 second) + a bit more
    await new Promise(resolve => setTimeout(resolve, 1200))
    
    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Fetching video information...')).toBeInTheDocument()
    })
  })

  it('should handle metadata fetch errors gracefully', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    render(<AddVideoModal {...defaultProps} />)
    
    // Switch to YouTube tab
    fireEvent.click(screen.getByText('YouTube URL'))
    
    // Enter YouTube URL
    const urlInput = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
    fireEvent.change(urlInput, { target: { value: 'https://www.youtube.com/watch?v=test' } })
    
    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('should not overwrite manually entered title', async () => {
    const mockMetadata = {
      success: true,
      metadata: {
        title: 'Auto-fetched Title',
        description: 'Auto-fetched description'
      }
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve(mockMetadata)
    } as Response)

    render(<AddVideoModal {...defaultProps} />)
    
    // Switch to YouTube tab
    fireEvent.click(screen.getByText('YouTube URL'))
    
    // Manually enter a title first
    const titleInput = screen.getByPlaceholderText('Title will be auto-filled from YouTube video')
    fireEvent.change(titleInput, { target: { value: 'Manual Title' } })
    
    // Then enter YouTube URL
    const urlInput = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
    fireEvent.change(urlInput, { target: { value: 'https://www.youtube.com/watch?v=test' } })
    
    // Wait for API call
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled()
    }, { timeout: 2000 })
    
    // Title should remain manually entered
    expect(titleInput).toHaveValue('Manual Title')
    
    // Description should still be auto-populated
    const descriptionInput = screen.getByDisplayValue('Auto-fetched description')
    expect(descriptionInput).toBeInTheDocument()
  })

  it('should allow submission without title for YouTube videos', async () => {
    render(<AddVideoModal {...defaultProps} />)
    
    // Switch to YouTube tab
    fireEvent.click(screen.getByText('YouTube URL'))
    
    // Enter YouTube URL without title
    const urlInput = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
    fireEvent.change(urlInput, { target: { value: 'https://www.youtube.com/watch?v=test' } })
    
    // Submit form
    const submitButton = screen.getByText('Add Video')
    fireEvent.click(submitButton)
    
    // Should not show title required error
    expect(screen.queryByText('Title is required')).not.toBeInTheDocument()
  })
})
