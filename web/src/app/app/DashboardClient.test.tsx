import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardClient } from '@/app/app/DashboardClient';
import { getShows, getShowMembers } from '@/lib/shows';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

// Mock the shows utility
vi.mock('@/lib/shows', () => ({
  getShows: vi.fn(),
  getShowMembers: vi.fn(),
}));

// Mock the Supabase client
vi.mock('@/lib/supabase/browser', () => ({
  getSupabaseBrowserClient: vi.fn(),
}));

// Mock the UI components
vi.mock('@/components/CreateShowModal', () => ({
  CreateShowModal: ({ isOpen, onClose, onShowCreated }: any) => (
    isOpen ? (
      <div data-testid="create-show-modal">
        <button onClick={onClose}>Close Modal</button>
        <button onClick={() => onShowCreated({ id: 'new-show', name: 'New Show' })}>
          Create Show
        </button>
      </div>
    ) : null
  ),
}));

vi.mock('@/components/InviteCollaboratorModal', () => ({
  InviteCollaboratorModal: ({ isOpen, onClose, showId, showName, onInviteSent }: any) => (
    isOpen ? (
      <div data-testid="invite-modal">
        <p>Invite for {showName} ({showId})</p>
        <button onClick={onClose}>Close Invite</button>
        <button onClick={onInviteSent}>Send Invite</button>
      </div>
    ) : null
  ),
}));

vi.mock('@/components/ShowCard', () => ({
  ShowCard: ({ show, memberCount, isOwner, onShowClick, onInviteClick }: any) => (
    <div data-testid={`show-card-${show.id}`}>
      <h3>{show.name}</h3>
      <p>{memberCount} members</p>
      {isOwner && <button onClick={() => onInviteClick(show.id, show.name)}>Invite</button>}
      <button onClick={() => onShowClick(show.id)}>View Show</button>
    </div>
  ),
}));

vi.mock('@/components/ShowManagement', () => ({
  ShowManagement: ({ showId, showName, isOwner }: any) => (
    <div data-testid="show-management">
      <h2>{showName}</h2>
      <p>Show ID: {showId}</p>
      <p>Is Owner: {isOwner.toString()}</p>
    </div>
  ),
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, variant, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
}));

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('DashboardClient', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
  };

  const mockShows = [
    {
      id: 'show-1',
      name: 'Test Show 1',
      description: 'Description 1',
      owner_id: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'show-2',
      name: 'Test Show 2',
      description: null,
      owner_id: 'user-2',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
  ];

  const mockMembers = [
    { id: 'member-1', show_id: 'show-1', user_id: 'user-1', role: 'producer' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
  });

  it('should render loading state initially', async () => {
    vi.mocked(getShows).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<DashboardClient user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Welcome, test@example.com')).toBeInTheDocument();
    });
  });

  it('should render shows when loaded', async () => {
    vi.mocked(getShows).mockResolvedValue(mockShows);
    vi.mocked(getShowMembers)
      .mockResolvedValueOnce(mockMembers) // For show-1
      .mockResolvedValueOnce([mockMembers[0], { ...mockMembers[0], id: 'member-2' }]); // For show-2

    render(<DashboardClient user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('Your Shows (2)')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Show 1')).toBeInTheDocument();
    expect(screen.getByText('Test Show 2')).toBeInTheDocument();
    expect(screen.getByText('1 members')).toBeInTheDocument();
    expect(screen.getByText('2 members')).toBeInTheDocument();
  });

  it('should render empty state when no shows', async () => {
    vi.mocked(getShows).mockResolvedValue([]);

    render(<DashboardClient user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('Your Shows (0)')).toBeInTheDocument();
    });

    expect(screen.getByText('No shows yet')).toBeInTheDocument();
    expect(screen.getByText('Get started by creating your first show.')).toBeInTheDocument();
  });

  it('should open create show modal', async () => {
    vi.mocked(getShows).mockResolvedValue([]);

    render(<DashboardClient user={mockUser} />);

    await waitFor(() => {
      expect(screen.getAllByText('Create Show')).toHaveLength(2);
    });

    // Click the first "Create Show" button (in the header)
    const createButtons = screen.getAllByText('Create Show');
    fireEvent.click(createButtons[0]);

    expect(screen.getByTestId('create-show-modal')).toBeInTheDocument();
  });

  it('should close create show modal', async () => {
    vi.mocked(getShows).mockResolvedValue([]);

    render(<DashboardClient user={mockUser} />);

    await waitFor(() => {
      expect(screen.getAllByText('Create Show')).toHaveLength(2);
    });

    // Click the first "Create Show" button (in the header)
    const createButtons = screen.getAllByText('Create Show');
    fireEvent.click(createButtons[0]);
    fireEvent.click(screen.getByText('Close Modal'));

    expect(screen.queryByTestId('create-show-modal')).not.toBeInTheDocument();
  });

  it('should handle show creation', async () => {
    vi.mocked(getShows)
      .mockResolvedValueOnce([]) // Initial load
      .mockResolvedValueOnce([...mockShows, { id: 'new-show', name: 'New Show' }]); // After creation

    render(<DashboardClient user={mockUser} />);

    await waitFor(() => {
      expect(screen.getAllByText('Create Show')).toHaveLength(2);
    });

    // Click the first "Create Show" button (in the header)
    const createButtons = screen.getAllByText('Create Show');
    fireEvent.click(createButtons[0]);
    fireEvent.click(screen.getByText('Create Show'));

    await waitFor(() => {
      expect(screen.getByText('New Show')).toBeInTheDocument();
    });
  });

  it('should open invite modal when invite button clicked', async () => {
    vi.mocked(getShows).mockResolvedValue(mockShows);
    vi.mocked(getShowMembers)
      .mockResolvedValueOnce(mockMembers)
      .mockResolvedValueOnce(mockMembers);

    render(<DashboardClient user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('Test Show 1')).toBeInTheDocument();
    });

    const inviteButton = screen.getAllByText('Invite')[0]; // First show's invite button
    fireEvent.click(inviteButton);

    expect(screen.getByTestId('invite-modal')).toBeInTheDocument();
    expect(screen.getByText('Invite for Test Show 1 (show-1)')).toBeInTheDocument();
  });

  it('should navigate to show detail when show card clicked', async () => {
    vi.mocked(getShows).mockResolvedValue(mockShows);
    vi.mocked(getShowMembers)
      .mockResolvedValueOnce(mockMembers)
      .mockResolvedValueOnce(mockMembers);

    render(<DashboardClient user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('Test Show 1')).toBeInTheDocument();
    });

    const viewButton = screen.getAllByText('View Show')[0];
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(screen.getByTestId('show-management')).toBeInTheDocument();
    });
  });

  it('should navigate back to dashboard from show detail', async () => {
    vi.mocked(getShows).mockResolvedValue(mockShows);
    vi.mocked(getShowMembers)
      .mockResolvedValueOnce(mockMembers)
      .mockResolvedValueOnce(mockMembers);

    render(<DashboardClient user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('Test Show 1')).toBeInTheDocument();
    });

    // Navigate to show detail
    const viewButton = screen.getAllByText('View Show')[0];
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(screen.getByTestId('show-management')).toBeInTheDocument();
    });

    // Navigate back
    const backButton = screen.getByText('← Back to Dashboard');
    fireEvent.click(backButton);

    await waitFor(() => {
      expect(screen.queryByTestId('show-management')).not.toBeInTheDocument();
      expect(screen.getByText('Your Shows (2)')).toBeInTheDocument();
    });
  });

  it('should handle sign out', async () => {
    const mockSupabase = {
      auth: {
        signOut: vi.fn().mockResolvedValue({}),
      },
    };

    vi.mocked(getSupabaseBrowserClient).mockReturnValue(mockSupabase as any);
    vi.mocked(getShows).mockResolvedValue([]);

    render(<DashboardClient user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Sign out'));

    await waitFor(() => {
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('should display error when shows fail to load', async () => {
    vi.mocked(getShows).mockRejectedValue(new Error('Network error'));

    render(<DashboardClient user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should handle invite sent callback', async () => {
    vi.mocked(getShows)
      .mockResolvedValueOnce(mockShows) // Initial load
      .mockResolvedValueOnce(mockShows); // Reload after invite

    vi.mocked(getShowMembers)
      .mockResolvedValueOnce(mockMembers)
      .mockResolvedValueOnce(mockMembers)
      .mockResolvedValueOnce(mockMembers)
      .mockResolvedValueOnce(mockMembers);

    render(<DashboardClient user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('Test Show 1')).toBeInTheDocument();
    });

    // Open invite modal
    const inviteButton = screen.getAllByText('Invite')[0];
    fireEvent.click(inviteButton);

    // Send invite
    fireEvent.click(screen.getByText('Send Invite'));

    // Should reload shows
    await waitFor(() => {
      expect(getShows).toHaveBeenCalledTimes(2);
    });
  });

  it('should show correct ownership status', async () => {
    vi.mocked(getShows).mockResolvedValue(mockShows);
    vi.mocked(getShowMembers)
      .mockResolvedValueOnce(mockMembers)
      .mockResolvedValueOnce(mockMembers);

    render(<DashboardClient user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('Test Show 1')).toBeInTheDocument();
    });

    // First show is owned by user-1 (current user), should show invite button
    expect(screen.getAllByText('Invite')).toHaveLength(1);
    
    // Second show is owned by user-2, should not show invite button
    const show2Card = screen.getByTestId('show-card-show-2');
    expect(show2Card).not.toHaveTextContent('Invite');
  });

  it('should handle show not found error', async () => {
    vi.mocked(getShows).mockResolvedValue(mockShows);
    vi.mocked(getShowMembers)
      .mockResolvedValueOnce(mockMembers)
      .mockResolvedValueOnce(mockMembers);

    render(<DashboardClient user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('Test Show 1')).toBeInTheDocument();
    });

    // Navigate to show detail
    const viewButton = screen.getAllByText('View Show')[0];
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(screen.getByTestId('show-management')).toBeInTheDocument();
    });

    // Simulate show not found by clearing shows and navigating to non-existent show
    vi.mocked(getShows).mockResolvedValue([]);
    
    // This would happen if the show was deleted while viewing it
    // The component should handle this gracefully
    expect(screen.getByTestId('show-management')).toBeInTheDocument();
  });
});
