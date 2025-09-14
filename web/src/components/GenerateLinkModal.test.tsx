import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerateLinkModal } from './GenerateLinkModal';

// Mock Supabase
const mockSupabase = {
  auth: {
    getSession: vi.fn(),
  },
};

vi.mock('@/lib/supabase/browser', () => ({
  getSupabaseBrowserClient: () => mockSupabase,
}));

// Mock fetch
global.fetch = vi.fn();

describe('GenerateLinkModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    videoId: 'test-video-id',
    onLinkGenerated: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    
    // Mock environment variables
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
  });

  it('renders modal when open', () => {
    render(<GenerateLinkModal {...defaultProps} />);
    
    expect(screen.getByText('Generate Secure Link')).toBeInTheDocument();
    expect(screen.getByLabelText('Expiry Date & Time (Optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Single-use link')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<GenerateLinkModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Generate Secure Link')).not.toBeInTheDocument();
  });

  it('handles form submission with expiry date', async () => {
    const mockResponse = {
      success: true,
      link: 'https://example.com/secure/test-token',
    };
    
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve(mockResponse),
    });

    render(<GenerateLinkModal {...defaultProps} />);
    
    const expiryInput = screen.getByPlaceholderText('Select expiry date and time');
    const generateButton = screen.getByText('Generate Link');
    
    fireEvent.change(expiryInput, { target: { value: '2024-12-31T23:59' } });
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(defaultProps.onLinkGenerated).toHaveBeenCalledWith(mockResponse.link);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('handles single-use link option', async () => {
    const mockResponse = {
      success: true,
      link: 'https://example.com/secure/test-token',
    };
    
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve(mockResponse),
    });

    render(<GenerateLinkModal {...defaultProps} />);
    
    const singleUseCheckbox = screen.getByLabelText('Single-use link');
    const generateButton = screen.getByText('Generate Link');
    
    fireEvent.click(singleUseCheckbox);
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/generate_secure_link'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"max_uses":1'),
        })
      );
    });
  });

  it('handles API errors', async () => {
    const mockResponse = {
      success: false,
      error: 'Permission denied',
    };
    
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve(mockResponse),
    });

    render(<GenerateLinkModal {...defaultProps} />);
    
    const generateButton = screen.getByText('Generate Link');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('Permission denied')).toBeInTheDocument();
    });
  });

  it('validates expiry date format', async () => {
    render(<GenerateLinkModal {...defaultProps} />);
    
    const expiryInput = screen.getByPlaceholderText('Select expiry date and time');
    const generateButton = screen.getByText('Generate Link');
    
    // Set invalid date
    fireEvent.change(expiryInput, { target: { value: 'invalid-date' } });
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid expiry date format')).toBeInTheDocument();
    });
  });

  it('handles authentication errors', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });

    render(<GenerateLinkModal {...defaultProps} />);
    
    const generateButton = screen.getByText('Generate Link');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('Not authenticated')).toBeInTheDocument();
    });
  });

  it('closes modal on cancel', () => {
    render(<GenerateLinkModal {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('closes modal on close button', () => {
    render(<GenerateLinkModal {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: '' }); // Close button with X icon
    fireEvent.click(closeButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
