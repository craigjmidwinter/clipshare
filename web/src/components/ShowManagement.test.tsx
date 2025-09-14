import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShowManagement } from '@/components/ShowManagement';
import { getShowMembers, getShowInvites, revokeInvite, removeMember } from '@/lib/shows';

// Mock the shows utility
vi.mock('@/lib/shows', () => ({
  getShowMembers: vi.fn(),
  getShowInvites: vi.fn(),
  revokeInvite: vi.fn(),
  removeMember: vi.fn(),
}));

// Mock the UI components
vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      className={className}
      {...props}
    >
      {children}
    </button>
  ),
}));

// Mock window.confirm
const mockConfirm = vi.fn();
Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
});

describe('ShowManagement', () => {
  const mockMembers = [
    {
      id: 'member-1',
      show_id: 'show-1',
      user_id: 'user-1',
      role: 'producer' as const,
      created_at: '2024-01-01T00:00:00Z',
      profiles: {
        display_name: 'John Doe',
        avatar_url: 'https://example.com/avatar.jpg',
      },
    },
    {
      id: 'member-2',
      show_id: 'show-1',
      user_id: 'user-2',
      role: 'collaborator' as const,
      created_at: '2024-01-02T00:00:00Z',
      profiles: {
        display_name: 'Jane Smith',
        avatar_url: null,
      },
    },
  ];

  const mockInvites = [
    {
      id: 'invite-1',
      show_id: 'show-1',
      email: 'newuser@example.com',
      token: 'token-123',
      invited_by: 'user-1',
      accepted_at: null,
      revoked_at: null,
      created_at: '2024-01-03T00:00:00Z',
      profiles: {
        display_name: 'John Doe',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockReturnValue(true);
  });

  it('should render loading state initially', () => {
    vi.mocked(getShowMembers).mockImplementation(() => new Promise(() => {})); // Never resolves
    vi.mocked(getShowInvites).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <ShowManagement
        showId="show-1"
        showName="Test Show"
        isOwner={true}
      />
    );

    expect(screen.getByText('Members (0)')).toBeInTheDocument();
    expect(screen.getByText('Pending Invites (0)')).toBeInTheDocument();
  });

  it('should render members and invites when loaded', async () => {
    vi.mocked(getShowMembers).mockResolvedValue(mockMembers);
    vi.mocked(getShowInvites).mockResolvedValue(mockInvites);

    render(
      <ShowManagement
        showId="show-1"
        showName="Test Show"
        isOwner={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Members (2)')).toBeInTheDocument();
      expect(screen.getByText('Pending Invites (1)')).toBeInTheDocument();
    });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Producer')).toBeInTheDocument();
    expect(screen.getByText('Collaborator')).toBeInTheDocument();
    expect(screen.getByText('newuser@example.com')).toBeInTheDocument();
  });

  it('should not show remove button for non-owners', async () => {
    vi.mocked(getShowMembers).mockResolvedValue(mockMembers);
    vi.mocked(getShowInvites).mockResolvedValue([]);

    render(
      <ShowManagement
        showId="show-1"
        showName="Test Show"
        isOwner={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Members (2)')).toBeInTheDocument();
    });

    expect(screen.queryByText('Remove')).not.toBeInTheDocument();
  });

  it('should not show remove button for producers', async () => {
    const membersWithProducer = [
      {
        ...mockMembers[0],
        role: 'producer' as const,
      },
    ];

    vi.mocked(getShowMembers).mockResolvedValue(membersWithProducer);
    vi.mocked(getShowInvites).mockResolvedValue([]);

    render(
      <ShowManagement
        showId="show-1"
        showName="Test Show"
        isOwner={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Members (1)')).toBeInTheDocument();
    });

    expect(screen.queryByText('Remove')).not.toBeInTheDocument();
  });

  it('should not show invites section for non-owners', async () => {
    vi.mocked(getShowMembers).mockResolvedValue(mockMembers);
    vi.mocked(getShowInvites).mockResolvedValue(mockInvites);

    render(
      <ShowManagement
        showId="show-1"
        showName="Test Show"
        isOwner={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Members (2)')).toBeInTheDocument();
    });

    expect(screen.queryByText('Pending Invites')).not.toBeInTheDocument();
  });

  it('should revoke invite when confirmed', async () => {
    vi.mocked(getShowMembers).mockResolvedValue([]);
    vi.mocked(getShowInvites).mockResolvedValue(mockInvites);

    render(
      <ShowManagement
        showId="show-1"
        showName="Test Show"
        isOwner={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Pending Invites (1)')).toBeInTheDocument();
    });

    const revokeButton = screen.getByText('Revoke');
    fireEvent.click(revokeButton);

    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to revoke this invite?');
    expect(revokeInvite).toHaveBeenCalledWith('invite-1');
  });

  it('should not revoke invite when not confirmed', async () => {
    mockConfirm.mockReturnValue(false);
    
    vi.mocked(getShowMembers).mockResolvedValue([]);
    vi.mocked(getShowInvites).mockResolvedValue(mockInvites);

    render(
      <ShowManagement
        showId="show-1"
        showName="Test Show"
        isOwner={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Pending Invites (1)')).toBeInTheDocument();
    });

    const revokeButton = screen.getByText('Revoke');
    fireEvent.click(revokeButton);

    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to revoke this invite?');
    expect(revokeInvite).not.toHaveBeenCalled();
  });

  it('should remove member when confirmed', async () => {
    vi.mocked(getShowMembers).mockResolvedValue(mockMembers);
    vi.mocked(getShowInvites).mockResolvedValue([]);

    render(
      <ShowManagement
        showId="show-1"
        showName="Test Show"
        isOwner={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Members (2)')).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByText('Remove');
    fireEvent.click(removeButtons[0]); // Remove Jane Smith (collaborator)

    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to remove Jane Smith from this show?');
    expect(removeMember).toHaveBeenCalledWith('show-1', 'user-2');
  });

  it('should handle revoke invite error', async () => {
    vi.mocked(getShowMembers).mockResolvedValue([]);
    vi.mocked(getShowInvites).mockResolvedValue(mockInvites);
    vi.mocked(revokeInvite).mockRejectedValue(new Error('Network error'));

    render(
      <ShowManagement
        showId="show-1"
        showName="Test Show"
        isOwner={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Pending Invites (1)')).toBeInTheDocument();
    });

    const revokeButton = screen.getByText('Revoke');
    fireEvent.click(revokeButton);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should handle remove member error', async () => {
    vi.mocked(getShowMembers).mockResolvedValue(mockMembers);
    vi.mocked(getShowInvites).mockResolvedValue([]);
    vi.mocked(removeMember).mockRejectedValue(new Error('Permission denied'));

    render(
      <ShowManagement
        showId="show-1"
        showName="Test Show"
        isOwner={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Members (2)')).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByText('Remove');
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Permission denied')).toBeInTheDocument();
    });
  });

  it('should show empty states when no members or invites', async () => {
    vi.mocked(getShowMembers).mockResolvedValue([]);
    vi.mocked(getShowInvites).mockResolvedValue([]);

    render(
      <ShowManagement
        showId="show-1"
        showName="Test Show"
        isOwner={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Members (0)')).toBeInTheDocument();
      expect(screen.getByText('Pending Invites (0)')).toBeInTheDocument();
      expect(screen.getByText('No members yet.')).toBeInTheDocument();
      expect(screen.getByText('No pending invites.')).toBeInTheDocument();
    });
  });

  it('should display member avatars with initials', async () => {
    vi.mocked(getShowMembers).mockResolvedValue(mockMembers);
    vi.mocked(getShowInvites).mockResolvedValue([]);

    render(
      <ShowManagement
        showId="show-1"
        showName="Test Show"
        isOwner={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('J')).toBeInTheDocument(); // John Doe initial
      expect(screen.getByText('J')).toBeInTheDocument(); // Jane Smith initial
    });
  });

  it('should display invite dates', async () => {
    vi.mocked(getShowMembers).mockResolvedValue([]);
    vi.mocked(getShowInvites).mockResolvedValue(mockInvites);

    render(
      <ShowManagement
        showId="show-1"
        showName="Test Show"
        isOwner={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('1/2/2024')).toBeInTheDocument(); // Invite date
    });
  });

  it('should reload data after successful operations', async () => {
    vi.mocked(getShowMembers).mockResolvedValue(mockMembers);
    vi.mocked(getShowInvites).mockResolvedValue(mockInvites);

    render(
      <ShowManagement
        showId="show-1"
        showName="Test Show"
        isOwner={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Members (2)')).toBeInTheDocument();
    });

    const revokeButton = screen.getByText('Revoke');
    fireEvent.click(revokeButton);

    // After successful revoke, should reload data
    await waitFor(() => {
      expect(getShowMembers).toHaveBeenCalledTimes(2); // Initial load + reload
    });
  });
});
