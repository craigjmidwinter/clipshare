import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoList } from './VideoList';
import { getVideos, formatFileSize, formatDuration } from '@/lib/videos';

// Mock the video service
vi.mock('@/lib/videos', async () => {
  const actual = await vi.importActual('@/lib/videos');
  return {
    ...actual,
    getVideos: vi.fn(),
    formatFileSize: vi.fn((bytes: number) => `${Math.round(bytes / 1024)} KB`),
    formatDuration: vi.fn((ms: number) => `${Math.floor(ms / 60000)}:${Math.floor((ms % 60000) / 1000).toString().padStart(2, '0')}`),
  };
});

const mockVideos = [
  {
    id: '1',
    show_id: 'show-1',
    title: 'Test Video 1',
    storage_path: 'videos/1/test1.mp4',
    duration_ms: 120000, // 2 minutes
    width: 1920,
    height: 1080,
    status: 'ready' as const,
    poster_path: 'thumbnails/1/poster.jpg',
    created_by: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    show_id: 'show-1',
    title: 'Test Video 2',
    storage_path: 'videos/2/test2.mp4',
    duration_ms: 30000, // 30 seconds
    width: 1280,
    height: 720,
    status: 'processing' as const,
    poster_path: null,
    created_by: 'user-1',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: '3',
    show_id: 'show-1',
    title: 'Test Video 3',
    storage_path: 'videos/3/test3.mp4',
    duration_ms: null,
    width: null,
    height: null,
    status: 'error' as const,
    poster_path: null,
    created_by: 'user-1',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
];

describe('VideoList', () => {
  const defaultProps = {
    showId: 'show-1',
    onVideoSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state initially', () => {
    (getVideos as any).mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<VideoList {...defaultProps} />);
    
    expect(screen.getByText('Loading videos...')).toBeInTheDocument();
  });

  it('should show error state when fetch fails', async () => {
    (getVideos as any).mockRejectedValue(new Error('Failed to load videos'));
    
    render(<VideoList {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load videos')).toBeInTheDocument();
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });
  });

  it('should show empty state when no videos', async () => {
    (getVideos as any).mockResolvedValue([]);
    
    render(<VideoList {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('No videos yet')).toBeInTheDocument();
      expect(screen.getByText(/Upload your first video/)).toBeInTheDocument();
    });
  });

  it('should display videos with correct information', async () => {
    (getVideos as any).mockResolvedValue(mockVideos);
    
    render(<VideoList {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Videos')).toBeInTheDocument();
      expect(screen.getByText('Test Video 1')).toBeInTheDocument();
      expect(screen.getByText('Test Video 2')).toBeInTheDocument();
      expect(screen.getByText('Test Video 3')).toBeInTheDocument();
    });
  });

  it('should show correct status indicators', async () => {
    (getVideos as any).mockResolvedValue(mockVideos);
    
    render(<VideoList {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Ready')).toBeInTheDocument();
      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  it('should display video metadata when available', async () => {
    (getVideos as any).mockResolvedValue(mockVideos);
    (formatDuration as any).mockImplementation((ms: number) => {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    });
    
    render(<VideoList {...defaultProps} />);
    
    await waitFor(() => {
      // Should show duration for videos that have it
      expect(screen.getByText('2:00')).toBeInTheDocument(); // 120000ms
      expect(screen.getByText('0:30')).toBeInTheDocument(); // 30000ms
      
      // Should show dimensions for videos that have them
      expect(screen.getByText('1920 × 1080')).toBeInTheDocument();
      expect(screen.getByText('1280 × 720')).toBeInTheDocument();
    });
  });

  it('should show error message for failed uploads', async () => {
    (getVideos as any).mockResolvedValue(mockVideos);
    
    render(<VideoList {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Upload failed. Please try again.')).toBeInTheDocument();
    });
  });

  it('should call onVideoSelect when ready video is clicked', async () => {
    const user = userEvent.setup();
    (getVideos as any).mockResolvedValue(mockVideos);
    
    render(<VideoList {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Video 1')).toBeInTheDocument();
    });
    
    // Click on the ready video card
    const readyVideoCard = screen.getByText('Test Video 1').closest('div');
    await user.click(readyVideoCard!);
    
    expect(defaultProps.onVideoSelect).toHaveBeenCalledWith(mockVideos[0]);
  });

  it('should not call onVideoSelect for non-ready videos', async () => {
    const user = userEvent.setup();
    (getVideos as any).mockResolvedValue(mockVideos);
    
    render(<VideoList {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Video 2')).toBeInTheDocument();
    });
    
    // Click on the processing video card
    const processingVideoCard = screen.getByText('Test Video 2').closest('div');
    await user.click(processingVideoCard!);
    
    expect(defaultProps.onVideoSelect).not.toHaveBeenCalled();
  });

  it('should show refresh button and reload videos when clicked', async () => {
    const user = userEvent.setup();
    (getVideos as any).mockResolvedValue(mockVideos);
    
    render(<VideoList {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
    
    // Clear previous calls
    vi.clearAllMocks();
    (getVideos as any).mockResolvedValue(mockVideos);
    
    await user.click(screen.getByText('Refresh'));
    
    expect(getVideos).toHaveBeenCalledWith('show-1');
  });

  it('should show poster image for ready videos', async () => {
    (getVideos as any).mockResolvedValue(mockVideos);
    
    render(<VideoList {...defaultProps} />);
    
    await waitFor(() => {
      const posterImage = screen.getByAltText('Test Video 1');
      expect(posterImage).toBeInTheDocument();
      expect(posterImage).toHaveAttribute('src', expect.stringContaining('/storage/v1/object/public/thumbnails/thumbnails/1/poster.jpg'));
    });
  });

  it('should show play button overlay for ready videos', async () => {
    (getVideos as any).mockResolvedValue(mockVideos);
    
    render(<VideoList {...defaultProps} />);
    
    await waitFor(() => {
      // Should have play button for ready videos
      const readyVideoCard = screen.getByText('Test Video 1').closest('div');
      expect(readyVideoCard).toHaveClass('cursor-pointer');
    });
  });

  it('should format dates correctly', async () => {
    (getVideos as any).mockResolvedValue(mockVideos);
    
    render(<VideoList {...defaultProps} />);
    
    await waitFor(() => {
      // Should show formatted dates
      expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument();
      expect(screen.getByText(/Jan 2, 2024/)).toBeInTheDocument();
      expect(screen.getByText(/Jan 3, 2024/)).toBeInTheDocument();
    });
  });
});
