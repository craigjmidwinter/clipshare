import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InviteAcceptPage from '@/app/invite/page';
import { acceptInvite } from '@/lib/shows';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

// Mock the shows utility
vi.mock('@/lib/shows', () => ({
  acceptInvite: vi.fn(),
}));

// Mock the Supabase client
vi.mock('@/lib/supabase/browser', () => ({
  getSupabaseBrowserClient: vi.fn(),
}));

// Mock Next.js router and search params
const mockPush = vi.fn();
const mockSearchParams = {
  get: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://example.com/invite?token=abc123',
  },
  writable: true,
});

describe('InviteAcceptPage', () => {
  const mockSupabase = {
    auth: {
      getSession: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockSearchParams.get.mockClear();
    vi.mocked(getSupabaseBrowserClient).mockReturnValue(mockSupabase as any);
  });

  it('should render invalid invite message when no token', () => {
    mockSearchParams.get.mockReturnValue(null);

    render(<InviteAcceptPage />);

    expect(screen.getByText('Invalid Invite')).toBeInTheDocument();
    expect(screen.getByText('This invite link is invalid or has expired.')).toBeInTheDocument();
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
  });

  it('should redirect to login when not authenticated', async () => {
    mockSearchParams.get.mockReturnValue('valid-token');
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });

    render(<InviteAcceptPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/login?redirect=' + encodeURIComponent('https://example.com/invite?token=abc123')
      );
    });
  });

  it('should render invite acceptance form when authenticated', async () => {
    mockSearchParams.get.mockReturnValue('valid-token');
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token' } },
    });

    render(<InviteAcceptPage />);

    await waitFor(() => {
      expect(screen.getByText('You\'re Invited!')).toBeInTheDocument();
      expect(screen.getByText('You\'ve been invited to collaborate on a show. Click below to accept the invitation.')).toBeInTheDocument();
      expect(screen.getByText('Accept Invitation')).toBeInTheDocument();
      expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
    });
  });

  it('should accept invite successfully', async () => {
    const mockResponse = {
      success: true,
      show: {
        id: 'show-1',
        name: 'Test Show',
        description: 'Test Description',
      },
      membership: {
        role: 'collaborator',
        createdAt: '2024-01-01T00:00:00Z',
      },
    };

    mockSearchParams.get.mockReturnValue('valid-token');
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token' } },
    });
    vi.mocked(acceptInvite).mockResolvedValue(mockResponse);

    render(<InviteAcceptPage />);

    await waitFor(() => {
      expect(screen.getByText('Accept Invitation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Accept Invitation'));

    await waitFor(() => {
      expect(acceptInvite).toHaveBeenCalledWith('valid-token');
      expect(screen.getByText('Welcome!')).toBeInTheDocument();
      expect(screen.getByText('Successfully joined "Test Show"!')).toBeInTheDocument();
      expect(screen.getByText('Test Show')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });

    // Should redirect after 2 seconds
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/app');
    }, { timeout: 3000 });
  });

  it('should handle accept invite error', async () => {
    mockSearchParams.get.mockReturnValue('valid-token');
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token' } },
    });
    vi.mocked(acceptInvite).mockRejectedValue(new Error('Invite expired'));

    render(<InviteAcceptPage />);

    await waitFor(() => {
      expect(screen.getByText('Accept Invitation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Accept Invitation'));

    await waitFor(() => {
      expect(screen.getByText('Invite expired')).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show loading state while accepting invite', async () => {
    mockSearchParams.get.mockReturnValue('valid-token');
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token' } },
    });

    // Mock a promise that never resolves to test loading state
    vi.mocked(acceptInvite).mockImplementation(() => new Promise(() => {}));

    render(<InviteAcceptPage />);

    await waitFor(() => {
      expect(screen.getByText('Accept Invitation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Accept Invitation'));

    await waitFor(() => {
      expect(screen.getByText('Accepting...')).toBeInTheDocument();
    });

    // Button should be disabled while loading
    const button = screen.getByText('Accepting...');
    expect(button).toBeDisabled();
  });

  it('should navigate to dashboard when go to dashboard button clicked', async () => {
    mockSearchParams.get.mockReturnValue('valid-token');
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token' } },
    });

    render(<InviteAcceptPage />);

    await waitFor(() => {
      expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Go to Dashboard'));

    expect(mockPush).toHaveBeenCalledWith('/app');
  });

  it('should navigate to dashboard from invalid invite page', () => {
    mockSearchParams.get.mockReturnValue(null);

    render(<InviteAcceptPage />);

    fireEvent.click(screen.getByText('Go to Dashboard'));

    expect(mockPush).toHaveBeenCalledWith('/app');
  });

  it('should handle network error gracefully', async () => {
    mockSearchParams.get.mockReturnValue('valid-token');
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token' } },
    });
    vi.mocked(acceptInvite).mockRejectedValue(new Error('Network error'));

    render(<InviteAcceptPage />);

    await waitFor(() => {
      expect(screen.getByText('Accept Invitation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Accept Invitation'));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should display show information in success state', async () => {
    const mockResponse = {
      success: true,
      show: {
        id: 'show-1',
        name: 'Amazing Show',
        description: 'This is an amazing show description',
      },
      membership: {
        role: 'collaborator',
        createdAt: '2024-01-01T00:00:00Z',
      },
    };

    mockSearchParams.get.mockReturnValue('valid-token');
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token' } },
    });
    vi.mocked(acceptInvite).mockResolvedValue(mockResponse);

    render(<InviteAcceptPage />);

    await waitFor(() => {
      expect(screen.getByText('Accept Invitation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Accept Invitation'));

    await waitFor(() => {
      expect(screen.getByText('Successfully joined "Amazing Show"!')).toBeInTheDocument();
      expect(screen.getByText('Amazing Show')).toBeInTheDocument();
      expect(screen.getByText('This is an amazing show description')).toBeInTheDocument();
    });
  });

  it('should handle show without description', async () => {
    const mockResponse = {
      success: true,
      show: {
        id: 'show-1',
        name: 'Simple Show',
        description: null,
      },
      membership: {
        role: 'collaborator',
        createdAt: '2024-01-01T00:00:00Z',
      },
    };

    mockSearchParams.get.mockReturnValue('valid-token');
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token' } },
    });
    vi.mocked(acceptInvite).mockResolvedValue(mockResponse);

    render(<InviteAcceptPage />);

    await waitFor(() => {
      expect(screen.getByText('Accept Invitation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Accept Invitation'));

    await waitFor(() => {
      expect(screen.getByText('Successfully joined "Simple Show"!')).toBeInTheDocument();
      expect(screen.getByText('Simple Show')).toBeInTheDocument();
    });
  });
});
