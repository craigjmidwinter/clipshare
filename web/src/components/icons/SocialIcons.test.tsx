import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleIcon, FacebookIcon } from './SocialIcons';

describe('SocialIcons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GoogleIcon', () => {
    it('renders Google icon with correct dimensions', () => {
      render(<GoogleIcon />);
      
      const svg = screen.getByRole('img', { hidden: true });
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width', '20');
      expect(svg).toHaveAttribute('height', '20');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    });

    it('forwards ref correctly', () => {
      const ref = vi.fn();
      render(<GoogleIcon ref={ref} />);
      
      expect(ref).toHaveBeenCalled();
    });

    it('applies custom props', () => {
      render(<GoogleIcon className="custom-class" data-testid="google-icon" />);
      
      const svg = screen.getByTestId('google-icon');
      expect(svg).toHaveClass('custom-class');
    });

    it('has proper accessibility attributes', () => {
      render(<GoogleIcon aria-label="Google logo" />);
      
      const svg = screen.getByLabelText('Google logo');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('FacebookIcon', () => {
    it('renders Facebook icon with correct dimensions', () => {
      render(<FacebookIcon />);
      
      const svg = screen.getByRole('img', { hidden: true });
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width', '20');
      expect(svg).toHaveAttribute('height', '20');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    });

    it('forwards ref correctly', () => {
      const ref = vi.fn();
      render(<FacebookIcon ref={ref} />);
      
      expect(ref).toHaveBeenCalled();
    });

    it('applies custom props', () => {
      render(<FacebookIcon className="custom-class" data-testid="facebook-icon" />);
      
      const svg = screen.getByTestId('facebook-icon');
      expect(svg).toHaveClass('custom-class');
    });

    it('has proper accessibility attributes', () => {
      render(<FacebookIcon aria-label="Facebook logo" />);
      
      const svg = screen.getByLabelText('Facebook logo');
      expect(svg).toBeInTheDocument();
    });
  });
});
