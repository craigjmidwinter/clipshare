import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActiveLinksList } from './ActiveLinksList';

// Mock Supabase
const mockSupabase = {
  auth: {
    getSession: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('@/lib/supabase/browser', () => ({
  getSupabaseBrowserClient: () => mockSupabase,
}));

// Mock QRCodeDisplay
vi.mock('./QRCodeDisplay', () => ({
  QRCodeDisplay: ({ url }: { url: string }) => (
    <div data-testid="qr-code">{url}</div>
  ),
}));

describe('ActiveLinksList', () => {
  const defaultProps = {
    videoId: 'test-video-id',
    onLinkRevoked: vi.fn(),
  };

  const mockLinks = [
    {
      id: 'link-1',
      token: 'token-1',
      expires_at: '2024-12-31T23:59:59Z',
      max_uses: 5,
      use_count: 2,
      revoked_at: null,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'link-2',
      token: 'token-2',
      expires_at: null,
      max_uses: null,
      use_count: 0,
      revoked_at: null,
      created_at: '2024-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
    
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };
    
    mockSupabase.from.mockReturnValue(mockQuery);
    mockQuery.select.mockResolvedValue({ data: mockLinks, error: null });
  });

  it('renders loading state initially', () => {
    render(<ActiveLinksList {...defaultProps} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders active links', async () => {
    render(<ActiveLinksList {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Active Secure Links')).toBeInTheDocument();
      expect(screen.getByText('Created 1/1/2024')).toBeInTheDocument();
      expect(screen.getByText('Created 1/2/2024')).toBeInTheDocument();
    });
  });

  it('shows expiry countdown for links with expiry', async () => {
    render(<ActiveLinksList {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/remaining/)).toBeInTheDocument();
    });
  });

  it('shows usage statistics', async () => {
    render(<ActiveLinksList {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('2/5 uses')).toBeInTheDocument();
      expect(screen.getByText('0 uses')).toBeInTheDocument();
    });
  });

  it('handles copy to clipboard', async () => {
    const mockWriteText = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(<ActiveLinksList {...defaultProps} />);
    
    await waitFor(() => {
      const copyButtons = screen.getAllByText('Copy');
      fireEvent.click(copyButtons[0]);
    });
    
    expect(mockWriteText).toHaveBeenCalledWith(
      expect.stringContaining('/secure/token-1')
    );
  });

  it('handles link revocation', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ error: null });
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockLinks, error: null }),
      update: mockUpdate,
    };
    
    mockSupabase.from.mockReturnValue(mockQuery);

    render(<ActiveLinksList {...defaultProps} />);
    
    await waitFor(() => {
      const revokeButtons = screen.getAllByText('Revoke');
      fireEvent.click(revokeButtons[0]);
    });
    
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        revoked_at: expect.any(String),
      });
      expect(defaultProps.onLinkRevoked).toHaveBeenCalled();
    });
  });

  it('shows error state when fetch fails', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: new Error('Fetch failed') }),
    };
    
    mockSupabase.from.mockReturnValue(mockQuery);

    render(<ActiveLinksList {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Fetch failed')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('shows empty state when no links', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    
    mockSupabase.from.mockReturnValue(mockQuery);

    render(<ActiveLinksList {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('No active secure links. Generate one to share this video securely.')).toBeInTheDocument();
    });
  });

  it('handles revocation errors', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ error: new Error('Revoke failed') });
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockLinks, error: null }),
      update: mockUpdate,
    };
    
    mockSupabase.from.mockReturnValue(mockQuery);

    render(<ActiveLinksList {...defaultProps} />);
    
    await waitFor(() => {
      const revokeButtons = screen.getAllByText('Revoke');
      fireEvent.click(revokeButtons[0]);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Revoke failed')).toBeInTheDocument();
    });
  });

  it('renders QR codes for each link', async () => {
    render(<ActiveLinksList {...defaultProps} />);
    
    await waitFor(() => {
      const qrCodes = screen.getAllByTestId('qr-code');
      expect(qrCodes).toHaveLength(2);
      expect(qrCodes[0]).toHaveTextContent('/secure/token-1');
      expect(qrCodes[1]).toHaveTextContent('/secure/token-2');
    });
  });
});
