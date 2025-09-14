import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateShowModal } from '@/components/CreateShowModal';
import { createShow } from '@/lib/shows';

// Mock the shows utility
vi.mock('@/lib/shows', () => ({
  createShow: vi.fn(),
}));

// Mock the UI components
vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, type, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
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

describe('CreateShowModal', () => {
  const mockOnClose = vi.fn();
  const mockOnShowCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    render(
      <CreateShowModal
        isOpen={false}
        onClose={mockOnClose}
        onShowCreated={mockOnShowCreated}
      />
    );

    expect(screen.queryByText('Create New Show')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(
      <CreateShowModal
        isOpen={true}
        onClose={mockOnClose}
        onShowCreated={mockOnShowCreated}
      />
    );

    expect(screen.getByText('Create New Show')).toBeInTheDocument();
    expect(screen.getByLabelText('Show Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Show' })).toBeInTheDocument();
  });

  it('should close modal when cancel button is clicked', () => {
    render(
      <CreateShowModal
        isOpen={true}
        onClose={mockOnClose}
        onShowCreated={mockOnShowCreated}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close modal when close button is clicked', () => {
    render(
      <CreateShowModal
        isOpen={true}
        onClose={mockOnClose}
        onShowCreated={mockOnShowCreated}
      />
    );

    const closeButton = screen.getByRole('button', { name: '' }); // Close button has no text
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show error when show name is empty', async () => {
    render(
      <CreateShowModal
        isOpen={true}
        onClose={mockOnClose}
        onShowCreated={mockOnShowCreated}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create Show' }));

    await waitFor(() => {
      expect(screen.getByText('Show name is required')).toBeInTheDocument();
    });
  });

  it('should create show successfully', async () => {
    const mockShow = {
      id: 'show-1',
      name: 'Test Show',
      description: 'Test Description',
      owner_id: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(createShow).mockResolvedValue(mockShow);

    render(
      <CreateShowModal
        isOpen={true}
        onClose={mockOnClose}
        onShowCreated={mockOnShowCreated}
      />
    );

    fireEvent.change(screen.getByLabelText('Show Name *'), {
      target: { value: 'Test Show' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Test Description' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Show' }));

    await waitFor(() => {
      expect(createShow).toHaveBeenCalledWith({
        name: 'Test Show',
        description: 'Test Description',
      });
      expect(mockOnShowCreated).toHaveBeenCalledWith(mockShow);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should handle create show error', async () => {
    vi.mocked(createShow).mockRejectedValue(new Error('Database error'));

    render(
      <CreateShowModal
        isOpen={true}
        onClose={mockOnClose}
        onShowCreated={mockOnShowCreated}
      />
    );

    fireEvent.change(screen.getByLabelText('Show Name *'), {
      target: { value: 'Test Show' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Show' }));

    await waitFor(() => {
      expect(screen.getByText('Database error')).toBeInTheDocument();
    });

    expect(mockOnShowCreated).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should disable form elements while loading', async () => {
    vi.mocked(createShow).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <CreateShowModal
        isOpen={true}
        onClose={mockOnClose}
        onShowCreated={mockOnShowCreated}
      />
    );

    fireEvent.change(screen.getByLabelText('Show Name *'), {
      target: { value: 'Test Show' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Show' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled();
      expect(screen.getByLabelText('Show Name *')).toBeDisabled();
      expect(screen.getByLabelText('Description')).toBeDisabled();
    });
  });

  it('should trim whitespace from inputs', async () => {
    const mockShow = {
      id: 'show-1',
      name: 'Test Show',
      description: 'Test Description',
      owner_id: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(createShow).mockResolvedValue(mockShow);

    render(
      <CreateShowModal
        isOpen={true}
        onClose={mockOnClose}
        onShowCreated={mockOnShowCreated}
      />
    );

    fireEvent.change(screen.getByLabelText('Show Name *'), {
      target: { value: '  Test Show  ' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: '  Test Description  ' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Show' }));

    await waitFor(() => {
      expect(createShow).toHaveBeenCalledWith({
        name: 'Test Show',
        description: 'Test Description',
      });
    });
  });

  it('should handle empty description', async () => {
    const mockShow = {
      id: 'show-1',
      name: 'Test Show',
      description: null,
      owner_id: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(createShow).mockResolvedValue(mockShow);

    render(
      <CreateShowModal
        isOpen={true}
        onClose={mockOnClose}
        onShowCreated={mockOnShowCreated}
      />
    );

    fireEvent.change(screen.getByLabelText('Show Name *'), {
      target: { value: 'Test Show' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Show' }));

    await waitFor(() => {
      expect(createShow).toHaveBeenCalledWith({
        name: 'Test Show',
        description: undefined,
      });
    });
  });
});
