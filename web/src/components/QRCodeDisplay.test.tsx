import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QRCodeDisplay } from './QRCodeDisplay';

// Mock QRCode library
const mockQRCode = {
  toCanvas: vi.fn(),
};

vi.mock('qrcode', () => mockQRCode);

describe('QRCodeDisplay', () => {
  const defaultProps = {
    url: 'https://example.com/test',
    size: 128,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockQRCode.toCanvas.mockResolvedValue(undefined);
  });

  it('renders canvas element', () => {
    render(<QRCodeDisplay {...defaultProps} />);
    
    const canvas = screen.getByRole('img', { hidden: true }); // Canvas elements are hidden by default
    expect(canvas).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<QRCodeDisplay {...defaultProps} />);
    
    expect(screen.getByText('Generating...')).toBeInTheDocument();
  });

  it('generates QR code on mount', async () => {
    const mockCanvas = document.createElement('canvas');
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas);
    
    render(<QRCodeDisplay {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockQRCode.toCanvas).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        defaultProps.url,
        expect.objectContaining({
          width: defaultProps.size,
          margin: 2,
        })
      );
    });
  });

  it('handles QR code generation errors', async () => {
    const error = new Error('QR generation failed');
    mockQRCode.toCanvas.mockRejectedValue(error);
    
    render(<QRCodeDisplay {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('QR Code Error')).toBeInTheDocument();
      expect(screen.getByText('QR generation failed')).toBeInTheDocument();
    });
  });

  it('updates QR code when URL changes', async () => {
    const { rerender } = render(<QRCodeDisplay {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockQRCode.toCanvas).toHaveBeenCalledTimes(1);
    });
    
    rerender(<QRCodeDisplay {...defaultProps} url="https://example.com/new" />);
    
    await waitFor(() => {
      expect(mockQRCode.toCanvas).toHaveBeenCalledTimes(2);
    });
  });

  it('updates QR code when size changes', async () => {
    const { rerender } = render(<QRCodeDisplay {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockQRCode.toCanvas).toHaveBeenCalledTimes(1);
    });
    
    rerender(<QRCodeDisplay {...defaultProps} size={256} />);
    
    await waitFor(() => {
      expect(mockQRCode.toCanvas).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        defaultProps.url,
        expect.objectContaining({
          width: 256,
        })
      );
    });
  });

  it('applies custom className', () => {
    render(<QRCodeDisplay {...defaultProps} className="custom-class" />);
    
    const container = screen.getByText('Generating...').parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('uses default size when not provided', () => {
    render(<QRCodeDisplay url="https://example.com/test" />);
    
    expect(mockQRCode.toCanvas).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      'https://example.com/test',
      expect.objectContaining({
        width: 128, // default size
      })
    );
  });
});
