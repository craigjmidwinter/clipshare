import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VideoControls } from './VideoControls';

// Mock child components
vi.mock('./GenerateLinkModal', () => ({
  GenerateLinkModal: ({ isOpen, onClose, onLinkGenerated }: any) => (
    <div data-testid="generate-modal" style={{ display: isOpen ? 'block' : 'none' }}>
      <button onClick={onClose}>Close Modal</button>
      <button onClick={() => onLinkGenerated('https://example.com/secure/test-token')}>
        Generate Link
      </button>
    </div>
  ),
}));

vi.mock('./ActiveLinksList', () => ({
  ActiveLinksList: ({ videoId, onLinkRevoked }: any) => (
    <div data-testid="active-links-list">
      Active Links for {videoId}
      <button onClick={onLinkRevoked}>Simulate Revoke</button>
    </div>
  ),
}));

describe('VideoControls', () => {
  const defaultProps = {
    videoId: 'test-video-id',
    isProducer: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when user is not a producer', () => {
    render(<VideoControls {...defaultProps} isProducer={false} />);
    
    expect(screen.queryByText('Share Video Securely')).not.toBeInTheDocument();
  });

  it('renders secure link controls for producers', () => {
    render(<VideoControls {...defaultProps} />);
    
    expect(screen.getByText('Share Video Securely')).toBeInTheDocument();
    expect(screen.getByText('Generate Secure Link')).toBeInTheDocument();
    expect(screen.getByText('Create a secure link to share this video with collaborators. Links can have expiry dates and usage limits.')).toBeInTheDocument();
  });

  it('opens generate modal when button is clicked', () => {
    render(<VideoControls {...defaultProps} />);
    
    const generateButton = screen.getByText('Generate Secure Link');
    fireEvent.click(generateButton);
    
    expect(screen.getByTestId('generate-modal')).toBeVisible();
  });

  it('displays generated link after generation', async () => {
    render(<VideoControls {...defaultProps} />);
    
    const generateButton = screen.getByText('Generate Secure Link');
    fireEvent.click(generateButton);
    
    const generateLinkButton = screen.getByText('Generate Link');
    fireEvent.click(generateLinkButton);
    
    await waitFor(() => {
      expect(screen.getByText('Link Generated Successfully!')).toBeInTheDocument();
      expect(screen.getByText('https://example.com/secure/test-token')).toBeInTheDocument();
    });
  });

  it('handles copy to clipboard for generated link', async () => {
    const mockWriteText = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(<VideoControls {...defaultProps} />);
    
    const generateButton = screen.getByText('Generate Secure Link');
    fireEvent.click(generateButton);
    
    const generateLinkButton = screen.getByText('Generate Link');
    fireEvent.click(generateLinkButton);
    
    await waitFor(() => {
      const copyButton = screen.getByText('Copied!');
      fireEvent.click(copyButton);
    });
    
    expect(mockWriteText).toHaveBeenCalledWith('https://example.com/secure/test-token');
  });

  it('shows copied message after copying', async () => {
    const mockWriteText = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(<VideoControls {...defaultProps} />);
    
    const generateButton = screen.getByText('Generate Secure Link');
    fireEvent.click(generateButton);
    
    const generateLinkButton = screen.getByText('Generate Link');
    fireEvent.click(generateLinkButton);
    
    await waitFor(() => {
      const copyButton = screen.getByText('Copied!');
      fireEvent.click(copyButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('renders ActiveLinksList component', () => {
    render(<VideoControls {...defaultProps} />);
    
    expect(screen.getByTestId('active-links-list')).toBeInTheDocument();
    expect(screen.getByText('Active Links for test-video-id')).toBeInTheDocument();
  });

  it('handles link revocation callback', () => {
    render(<VideoControls {...defaultProps} />);
    
    const revokeButton = screen.getByText('Simulate Revoke');
    fireEvent.click(revokeButton);
    
    // Should not throw any errors
    expect(screen.getByTestId('active-links-list')).toBeInTheDocument();
  });

  it('closes modal when close button is clicked', () => {
    render(<VideoControls {...defaultProps} />);
    
    const generateButton = screen.getByText('Generate Secure Link');
    fireEvent.click(generateButton);
    
    expect(screen.getByTestId('generate-modal')).toBeVisible();
    
    const closeButton = screen.getByText('Close Modal');
    fireEvent.click(closeButton);
    
    expect(screen.getByTestId('generate-modal')).not.toBeVisible();
  });

  it('clears generated link when modal is closed', () => {
    render(<VideoControls {...defaultProps} />);
    
    // Generate a link
    const generateButton = screen.getByText('Generate Secure Link');
    fireEvent.click(generateButton);
    
    const generateLinkButton = screen.getByText('Generate Link');
    fireEvent.click(generateLinkButton);
    
    // Close modal
    const closeButton = screen.getByText('Close Modal');
    fireEvent.click(closeButton);
    
    // Generated link should be cleared
    expect(screen.queryByText('Link Generated Successfully!')).not.toBeInTheDocument();
  });
});
