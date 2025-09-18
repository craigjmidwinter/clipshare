import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import VideoAccessControlModal from './VideoAccessControlModal'

describe('VideoAccessControlModal', () => {
  const mockOnClose = vi.fn()
  const mockOnConfirm = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when closed', () => {
    render(
      <VideoAccessControlModal
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    expect(screen.queryByText('Video Access Control')).not.toBeInTheDocument()
  })

  it('should render when open', () => {
    render(
      <VideoAccessControlModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    expect(screen.getByText('Video Access Control')).toBeInTheDocument()
    expect(screen.getByText('Important: Producer Access Warning')).toBeInTheDocument()
  })

  it('should show custom video title', () => {
    render(
      <VideoAccessControlModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        videoTitle="My Custom Video"
      />
    )

    expect(screen.getByText('Control who can access My Custom Video')).toBeInTheDocument()
  })

  it('should start with private access selected by default', () => {
    render(
      <VideoAccessControlModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    const privateRadio = screen.getByLabelText(/Private Access/)
    expect(privateRadio).toBeChecked()
  })

  it('should allow switching between access options', () => {
    render(
      <VideoAccessControlModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    const privateRadio = screen.getByLabelText(/Private Access/)
    const publicRadio = screen.getByLabelText(/Workspace Access/)

    expect(privateRadio).toBeChecked()
    expect(publicRadio).not.toBeChecked()

    fireEvent.click(publicRadio)

    expect(privateRadio).not.toBeChecked()
    expect(publicRadio).toBeChecked()
  })

  it('should disable confirm button until acknowledgment is checked', () => {
    render(
      <VideoAccessControlModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    const confirmButton = screen.getByText('Add Video')
    const acknowledgeCheckbox = screen.getByLabelText(/I understand that producers/)

    expect(confirmButton).toBeDisabled()
    expect(acknowledgeCheckbox).not.toBeChecked()

    fireEvent.click(acknowledgeCheckbox)

    expect(acknowledgeCheckbox).toBeChecked()
    expect(confirmButton).not.toBeDisabled()
  })

  it('should call onConfirm with correct parameters when confirmed', () => {
    render(
      <VideoAccessControlModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    // Check acknowledgment
    const acknowledgeCheckbox = screen.getByLabelText(/I understand that producers/)
    fireEvent.click(acknowledgeCheckbox)

    // Select workspace access
    const publicRadio = screen.getByLabelText(/Workspace Access/)
    fireEvent.click(publicRadio)

    // Confirm
    const confirmButton = screen.getByText('Add Video')
    fireEvent.click(confirmButton)

    expect(mockOnConfirm).toHaveBeenCalledWith(true, true)
  })

  it('should call onClose when cancel is clicked', () => {
    render(
      <VideoAccessControlModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should show producer access warning', () => {
    render(
      <VideoAccessControlModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    expect(screen.getByText('Producers have full access to all videos in this workspace.')).toBeInTheDocument()
    expect(screen.getByText('Play videos through the VTR system during production')).toBeInTheDocument()
    expect(screen.getByText('Download video clips and files')).toBeInTheDocument()
    expect(screen.getByText('Access video metadata and processing information')).toBeInTheDocument()
    expect(screen.getByText('Generate bookmarks and clips from your videos')).toBeInTheDocument()
  })

  it('should show access control options with correct descriptions', () => {
    render(
      <VideoAccessControlModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    // Private access option
    expect(screen.getByText('Only you and the producer can access this video.')).toBeInTheDocument()
    expect(screen.getByText('Other collaborators will not see or be able to use this video.')).toBeInTheDocument()

    // Workspace access option
    expect(screen.getByText('All workspace members can access this video.')).toBeInTheDocument()
    expect(screen.getByText('They can view, create bookmarks, and generate clips from it.')).toBeInTheDocument()
  })
})
