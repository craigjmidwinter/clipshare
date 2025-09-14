import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InviteCollaboratorModal } from '@/components/InviteCollaboratorModal';
import { sendInvite } from '@/lib/shows';

// Mock the shows utility
vi.mock('@/lib/shows', () => ({
  sendInvite: vi.fn(),
}));

// Mock the UI components
vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, type, variant, size, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/Input', () => ({
  Input: ({ onChange, value, ...props }: any) => (
    <input
      onChange={onChange}
      value={value}
      {...props}
    />
  ),
}));

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe('InviteCollaboratorModal', () => {
  const mockOnClose = vi.fn();
  const mockOnInviteSent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    render(
      <InviteCollaboratorModal
        isOpen={false}
        onClose={mockOnClose}
        showId="show-1"
        showName="Test Show"
        onInviteSent={mockOnInviteSent}
      />
    );

    expect(screen.queryByText('Invite Collaborator')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(
      <InviteCollaboratorModal
        isOpen={true}
        onClose={mockOnClose}
        showId="show-1"
        showName="Test Show"
        onInviteSent={mockOnInviteSent}
      />
    );

    expect(screen.getByText('Invite Collaborator')).toBeInTheDocument();
    expect(screen.getByText('Show: Test Show')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address *')).toBeInTheDocument();
    expect(screen.getByLabelText('Role')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send Invite' })).toBeInTheDocument();
  });

  it('should close modal when cancel button is clicked', () => {
    render(
      <InviteCollaboratorModal
        isOpen={true}
        onClose={mockOnClose}
        showId="show-1"
        showName="Test Show"
        onInviteSent={mockOnInviteSent}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show error when email is empty', async () => {
    render(
      <InviteCollaboratorModal
        isOpen={true}
        onClose={mockOnClose}
        showId="show-1"
        showName="Test Show"
        onInviteSent={mockOnInviteSent}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send Invite' }));

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  it('should show error when email is invalid', async () => {
    render(
      <InviteCollaboratorModal
        isOpen={true}
        onClose={mockOnClose}
        showId="show-1"
        showName="Test Show"
        onInviteSent={mockOnInviteSent}
      />
    );

    fireEvent.change(screen.getByLabelText('Email Address *'), {
      target: { value: 'invalid-email' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send Invite' }));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('should send invite successfully', async () => {
    const mockResponse = {
      invite: {
        id: 'invite-1',
        email: 'test@example.com',
        token: 'token-123',
        inviteLink: 'https://example.com/invite/token-123',
        createdAt: '2024-01-01T00:00:00Z',
      },
    };

    vi.mocked(sendInvite).mockResolvedValue(mockResponse);

    render(
      <InviteCollaboratorModal
        isOpen={true}
        onClose={mockOnClose}
        showId="show-1"
        showName="Test Show"
        onInviteSent={mockOnInviteSent}
      />
    );

    fireEvent.change(screen.getByLabelText('Email Address *'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Role'), {
      target: { value: 'producer' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send Invite' }));

    await waitFor(() => {
      expect(sendInvite).toHaveBeenCalledWith({
        showId: 'show-1',
        email: 'test@example.com',
        role: 'producer',
      });
      expect(screen.getByText('Invite sent to test@example.com! Share this link:')).toBeInTheDocument();
      expect(screen.getByText('https://example.com/invite/token-123')).toBeInTheDocument();
    });

    expect(mockOnInviteSent).toHaveBeenCalled();
  });

  it('should handle send invite error', async () => {
    vi.mocked(sendInvite).mockRejectedValue(new Error('User already invited'));

    render(
      <InviteCollaboratorModal
        isOpen={true}
        onClose={mockOnClose}
        showId="show-1"
        showName="Test Show"
        onInviteSent={mockOnInviteSent}
      />
    );

    fireEvent.change(screen.getByLabelText('Email Address *'), {
      target: { value: 'test@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send Invite' }));

    await waitFor(() => {
      expect(screen.getByText('User already invited')).toBeInTheDocument();
    });

    expect(mockOnInviteSent).not.toHaveBeenCalled();
  });

  it('should copy invite link to clipboard', async () => {
    const mockResponse = {
      invite: {
        id: 'invite-1',
        email: 'test@example.com',
        token: 'token-123',
        inviteLink: 'https://example.com/invite/token-123',
        createdAt: '2024-01-01T00:00:00Z',
      },
    };

    vi.mocked(sendInvite).mockResolvedValue(mockResponse);

    render(
      <InviteCollaboratorModal
        isOpen={true}
        onClose={mockOnClose}
        showId="show-1"
        showName="Test Show"
        onInviteSent={mockOnInviteSent}
      />
    );

    fireEvent.change(screen.getByLabelText('Email Address *'), {
      target: { value: 'test@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send Invite' }));

    await waitFor(() => {
      expect(screen.getByText('Invite sent to test@example.com! Share this link:')).toBeInTheDocument();
    });

    const copyButton = screen.getByRole('button', { name: 'Copy' });
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/invite/token-123');
  });

  it('should disable form elements while loading', async () => {
    vi.mocked(sendInvite).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <InviteCollaboratorModal
        isOpen={true}
        onClose={mockOnClose}
        showId="show-1"
        showName="Test Show"
        onInviteSent={mockOnInviteSent}
      />
    );

    fireEvent.change(screen.getByLabelText('Email Address *'), {
      target: { value: 'test@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send Invite' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled();
      expect(screen.getByLabelText('Email Address *')).toBeDisabled();
      expect(screen.getByLabelText('Role')).toBeDisabled();
    });
  });

  it('should trim whitespace from email input', async () => {
    const mockResponse = {
      invite: {
        id: 'invite-1',
        email: 'test@example.com',
        token: 'token-123',
        inviteLink: 'https://example.com/invite/token-123',
        createdAt: '2024-01-01T00:00:00Z',
      },
    };

    vi.mocked(sendInvite).mockResolvedValue(mockResponse);

    render(
      <InviteCollaboratorModal
        isOpen={true}
        onClose={mockOnClose}
        showId="show-1"
        showName="Test Show"
        onInviteSent={mockOnInviteSent}
      />
    );

    fireEvent.change(screen.getByLabelText('Email Address *'), {
      target: { value: '  test@example.com  ' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send Invite' }));

    await waitFor(() => {
      expect(sendInvite).toHaveBeenCalledWith({
        showId: 'show-1',
        email: 'test@example.com',
        role: 'collaborator',
      });
    });
  });

  it('should show close button instead of cancel when invite is sent', async () => {
    const mockResponse = {
      invite: {
        id: 'invite-1',
        email: 'test@example.com',
        token: 'token-123',
        inviteLink: 'https://example.com/invite/token-123',
        createdAt: '2024-01-01T00:00:00Z',
      },
    };

    vi.mocked(sendInvite).mockResolvedValue(mockResponse);

    render(
      <InviteCollaboratorModal
        isOpen={true}
        onClose={mockOnClose}
        showId="show-1"
        showName="Test Show"
        onInviteSent={mockOnInviteSent}
      />
    );

    fireEvent.change(screen.getByLabelText('Email Address *'), {
      target: { value: 'test@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send Invite' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Send Invite' })).not.toBeInTheDocument();
    });
  });

  it('should default to collaborator role', () => {
    render(
      <InviteCollaboratorModal
        isOpen={true}
        onClose={mockOnClose}
        showId="show-1"
        showName="Test Show"
        onInviteSent={mockOnInviteSent}
      />
    );

    const roleSelect = screen.getByLabelText('Role');
    expect(roleSelect).toHaveValue('collaborator');
  });
});
