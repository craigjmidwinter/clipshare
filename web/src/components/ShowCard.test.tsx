import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShowCard } from '@/components/ShowCard';
import { Show } from '@/lib/shows';

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

// Mock the shows utility
vi.mock('@/lib/shows', () => ({
  formatDate: vi.fn((date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }),
}));

describe('ShowCard', () => {
  const mockShow: Show = {
    id: 'show-1',
    name: 'Test Show',
    description: 'A test show description',
    owner_id: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  };

  const mockOnShowClick = vi.fn();
  const mockOnInviteClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render show information correctly', () => {
    render(
      <ShowCard
        show={mockShow}
        memberCount={5}
        isOwner={true}
        onShowClick={mockOnShowClick}
        onInviteClick={mockOnInviteClick}
      />
    );

    expect(screen.getByText('Test Show')).toBeInTheDocument();
    expect(screen.getByText('A test show description')).toBeInTheDocument();
    expect(screen.getByText('5 members')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Created Jan 1, 2024')).toBeInTheDocument();
    expect(screen.getByText('Last updated Jan 2, 2024')).toBeInTheDocument();
  });

  it('should render show without description', () => {
    const showWithoutDescription = {
      ...mockShow,
      description: null,
    };

    render(
      <ShowCard
        show={showWithoutDescription}
        memberCount={1}
        isOwner={false}
        onShowClick={mockOnShowClick}
        onInviteClick={mockOnInviteClick}
      />
    );

    expect(screen.getByText('Test Show')).toBeInTheDocument();
    expect(screen.getByText('1 member')).toBeInTheDocument();
    expect(screen.queryByText('Owner')).not.toBeInTheDocument();
  });

  it('should call onShowClick when card is clicked', () => {
    render(
      <ShowCard
        show={mockShow}
        memberCount={3}
        isOwner={true}
        onShowClick={mockOnShowClick}
        onInviteClick={mockOnInviteClick}
      />
    );

    const card = screen.getByText('Test Show').closest('div');
    fireEvent.click(card!);

    expect(mockOnShowClick).toHaveBeenCalledWith('show-1');
  });

  it('should call onInviteClick when invite button is clicked', () => {
    render(
      <ShowCard
        show={mockShow}
        memberCount={2}
        isOwner={true}
        onShowClick={mockOnShowClick}
        onInviteClick={mockOnInviteClick}
      />
    );

    const inviteButton = screen.getByText('Invite');
    fireEvent.click(inviteButton);

    expect(mockOnInviteClick).toHaveBeenCalledWith('show-1', 'Test Show');
  });

  it('should not show invite button for non-owners', () => {
    render(
      <ShowCard
        show={mockShow}
        memberCount={4}
        isOwner={false}
        onShowClick={mockOnShowClick}
        onInviteClick={mockOnInviteClick}
      />
    );

    expect(screen.queryByText('Invite')).not.toBeInTheDocument();
  });

  it('should handle single member correctly', () => {
    render(
      <ShowCard
        show={mockShow}
        memberCount={1}
        isOwner={true}
        onShowClick={mockOnShowClick}
        onInviteClick={mockOnInviteClick}
      />
    );

    expect(screen.getByText('1 member')).toBeInTheDocument();
  });

  it('should handle multiple members correctly', () => {
    render(
      <ShowCard
        show={mockShow}
        memberCount={10}
        isOwner={true}
        onShowClick={mockOnShowClick}
        onInviteClick={mockOnInviteClick}
      />
    );

    expect(screen.getByText('10 members')).toBeInTheDocument();
  });

  it('should not call onShowClick when invite button is clicked', () => {
    render(
      <ShowCard
        show={mockShow}
        memberCount={3}
        isOwner={true}
        onShowClick={mockOnShowClick}
        onInviteClick={mockOnInviteClick}
      />
    );

    const inviteButton = screen.getByText('Invite');
    fireEvent.click(inviteButton);

    expect(mockOnInviteClick).toHaveBeenCalledWith('show-1', 'Test Show');
    expect(mockOnShowClick).not.toHaveBeenCalled();
  });

  it('should apply hover styles on mouse enter', () => {
    render(
      <ShowCard
        show={mockShow}
        memberCount={2}
        isOwner={true}
        onShowClick={mockOnShowClick}
        onInviteClick={mockOnInviteClick}
      />
    );

    const card = screen.getByText('Test Show').closest('div');
    fireEvent.mouseEnter(card!);

    // The hover state is handled by CSS classes, so we can't easily test the visual changes
    // But we can verify the component doesn't break on hover
    expect(screen.getByText('Test Show')).toBeInTheDocument();
  });

  it('should remove hover styles on mouse leave', () => {
    render(
      <ShowCard
        show={mockShow}
        memberCount={2}
        isOwner={true}
        onShowClick={mockOnShowClick}
        onInviteClick={mockOnInviteClick}
      />
    );

    const card = screen.getByText('Test Show').closest('div');
    fireEvent.mouseEnter(card!);
    fireEvent.mouseLeave(card!);

    expect(screen.getByText('Test Show')).toBeInTheDocument();
  });

  it('should display correct date formatting', () => {
    render(
      <ShowCard
        show={mockShow}
        memberCount={1}
        isOwner={false}
        onShowClick={mockOnShowClick}
        onInviteClick={mockOnInviteClick}
      />
    );

    expect(screen.getByText('Created Jan 1, 2024')).toBeInTheDocument();
    expect(screen.getByText('Last updated Jan 2, 2024')).toBeInTheDocument();
  });

  it('should render all required elements', () => {
    render(
      <ShowCard
        show={mockShow}
        memberCount={3}
        isOwner={true}
        onShowClick={mockOnShowClick}
        onInviteClick={mockOnInviteClick}
      />
    );

    // Check for all main elements
    expect(screen.getByText('Test Show')).toBeInTheDocument();
    expect(screen.getByText('A test show description')).toBeInTheDocument();
    expect(screen.getByText('3 members')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Created Jan 1, 2024')).toBeInTheDocument();
    expect(screen.getByText('Last updated Jan 2, 2024')).toBeInTheDocument();
    expect(screen.getByText('Invite')).toBeInTheDocument();
    
    // Check for clock and arrow icons (they should be present as SVG elements)
    const clockIcon = screen.getByRole('img', { hidden: true }) || 
                     document.querySelector('svg[viewBox="0 0 24 24"]');
    expect(clockIcon).toBeTruthy();
  });
});
