import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoUpload } from './VideoUpload';
import { validateVideoFile, formatFileSize } from '@/lib/videos';

// Mock the video service
vi.mock('@/lib/videos', async () => {
  const actual = await vi.importActual('@/lib/videos');
  return {
    ...actual,
    validateVideoFile: vi.fn(),
    formatFileSize: vi.fn(),
    videoUploadService: {
      addUpload: vi.fn(() => 'upload-123'),
      subscribe: vi.fn(() => vi.fn()), // Return unsubscribe function
      removeUpload: vi.fn(),
      getUpload: vi.fn(),
    },
  };
});

const mockVideoUploadService = {
  addUpload: vi.fn(() => 'upload-123'),
  subscribe: vi.fn(() => vi.fn()),
  removeUpload: vi.fn(),
  getUpload: vi.fn(),
};

describe('VideoUpload', () => {
  const defaultProps = {
    showId: 'show-123',
    onUploadComplete: vi.fn(),
    onUploadError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (validateVideoFile as any).mockReturnValue(null); // Valid file by default
    (formatFileSize as any).mockImplementation((bytes: number) => `${Math.round(bytes / 1024)} KB`);
  });

  it('should render upload area', () => {
    render(<VideoUpload {...defaultProps} />);
    
    expect(screen.getByText(/Drop video files here/)).toBeInTheDocument();
    expect(screen.getByText(/browse to upload/)).toBeInTheDocument();
    expect(screen.getByText(/MP4, MOV, AVI, WebM up to 1GB/)).toBeInTheDocument();
  });

  it('should handle file selection via button', async () => {
    const user = userEvent.setup();
    render(<VideoUpload {...defaultProps} />);
    
    const file = new File(['test content'], 'test.mp4', { type: 'video/mp4' });
    const fileInput = screen.getByLabelText(/browse to upload/);
    
    await user.upload(fileInput, file);
    
    expect(mockVideoUploadService.addUpload).toHaveBeenCalledWith(file, 'show-123');
  });

  it('should handle drag and drop', async () => {
    render(<VideoUpload {...defaultProps} />);
    
    const dropZone = screen.getByText(/Drop video files here/).closest('div');
    const file = new File(['test content'], 'test.mp4', { type: 'video/mp4' });
    
    // Simulate drag over
    fireEvent.dragOver(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    });
    
    // Simulate drop
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    });
    
    expect(mockVideoUploadService.addUpload).toHaveBeenCalledWith(file, 'show-123');
  });

  it('should handle multiple file uploads', async () => {
    const user = userEvent.setup();
    render(<VideoUpload {...defaultProps} />);
    
    const file1 = new File(['content1'], 'test1.mp4', { type: 'video/mp4' });
    const file2 = new File(['content2'], 'test2.mp4', { type: 'video/mp4' });
    const fileInput = screen.getByLabelText(/browse to upload/);
    
    await user.upload(fileInput, [file1, file2]);
    
    expect(mockVideoUploadService.addUpload).toHaveBeenCalledTimes(2);
    expect(mockVideoUploadService.addUpload).toHaveBeenCalledWith(file1, 'show-123');
    expect(mockVideoUploadService.addUpload).toHaveBeenCalledWith(file2, 'show-123');
  });

  it('should show drag over state', () => {
    render(<VideoUpload {...defaultProps} />);
    
    const dropZone = screen.getByText(/Drop video files here/).closest('div');
    
    // Initially should not have drag over styling
    expect(dropZone).not.toHaveClass('border-blue-500', 'bg-blue-50');
    
    // Simulate drag over
    fireEvent.dragOver(dropZone!, {
      dataTransfer: {
        files: [],
      },
    });
    
    // Should have drag over styling
    expect(dropZone).toHaveClass('border-blue-500', 'bg-blue-50');
    
    // Simulate drag leave
    fireEvent.dragLeave(dropZone!, {
      dataTransfer: {
        files: [],
      },
    });
    
    // Should remove drag over styling
    expect(dropZone).not.toHaveClass('border-blue-500', 'bg-blue-50');
  });

  it('should handle file validation errors', async () => {
    const user = userEvent.setup();
    (validateVideoFile as any).mockReturnValue('Invalid file type');
    
    render(<VideoUpload {...defaultProps} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/browse to upload/);
    
    await user.upload(fileInput, file);
    
    expect(mockVideoUploadService.addUpload).not.toHaveBeenCalled();
    expect(defaultProps.onUploadError).toHaveBeenCalledWith('Invalid file type');
  });

  it('should show upload progress when uploads are active', () => {
    // Mock upload state
    const mockUploadState = {
      file: new File(['test'], 'test.mp4', { type: 'video/mp4' }),
      progress: {
        loaded: 512000,
        total: 1024000,
        percentage: 50,
        speed: 1024000,
        timeRemaining: 0.5,
      },
      status: 'uploading' as const,
    };

    (mockVideoUploadService.getUpload as any).mockReturnValue(mockUploadState);
    (formatFileSize as any).mockImplementation((bytes: number) => `${Math.round(bytes / 1024)} KB`);

    render(<VideoUpload {...defaultProps} />);
    
    // Simulate adding an upload
    const file = new File(['test content'], 'test.mp4', { type: 'video/mp4' });
    const dropZone = screen.getByText(/Drop video files here/).closest('div');
    
    fireEvent.drop(dropZone!, {
      dataTransfer: { files: [file] },
    });

    // Should show upload progress section
    expect(screen.getByText('Upload Progress')).toBeInTheDocument();
  });

  it('should allow removing uploads', async () => {
    const user = userEvent.setup();
    
    // Mock upload state
    const mockUploadState = {
      file: new File(['test'], 'test.mp4', { type: 'video/mp4' }),
      progress: {
        loaded: 512000,
        total: 1024000,
        percentage: 50,
        speed: 1024000,
        timeRemaining: 0.5,
      },
      status: 'uploading' as const,
    };

    (mockVideoUploadService.getUpload as any).mockReturnValue(mockUploadState);

    render(<VideoUpload {...defaultProps} />);
    
    // Simulate adding an upload
    const file = new File(['test content'], 'test.mp4', { type: 'video/mp4' });
    const fileInput = screen.getByLabelText(/browse to upload/);
    
    await user.upload(fileInput, file);

    // Find and click remove button
    const removeButton = screen.getByRole('button', { name: /remove/i });
    await user.click(removeButton);
    
    expect(mockVideoUploadService.removeUpload).toHaveBeenCalledWith('upload-123');
  });

  it('should show error state and retry option', async () => {
    const user = userEvent.setup();
    
    // Mock upload state with error
    const mockUploadState = {
      file: new File(['test'], 'test.mp4', { type: 'video/mp4' }),
      progress: {
        loaded: 0,
        total: 1024000,
        percentage: 0,
        speed: 0,
        timeRemaining: 0,
      },
      status: 'error' as const,
      error: 'Upload failed',
    };

    (mockVideoUploadService.getUpload as any).mockReturnValue(mockUploadState);

    render(<VideoUpload {...defaultProps} />);
    
    // Simulate adding an upload
    const file = new File(['test content'], 'test.mp4', { type: 'video/mp4' });
    const fileInput = screen.getByLabelText(/browse to upload/);
    
    await user.upload(fileInput, file);

    // Should show error message and retry button
    expect(screen.getByText(/Error: Upload failed/)).toBeInTheDocument();
    expect(screen.getByText(/Retry upload/)).toBeInTheDocument();
    
    // Click retry
    await user.click(screen.getByText(/Retry upload/));
    
    expect(mockVideoUploadService.removeUpload).toHaveBeenCalledWith('upload-123');
  });

  it('should show processing state', () => {
    // Mock upload state with processing
    const mockUploadState = {
      file: new File(['test'], 'test.mp4', { type: 'video/mp4' }),
      progress: {
        loaded: 1024000,
        total: 1024000,
        percentage: 100,
        speed: 0,
        timeRemaining: 0,
      },
      status: 'processing' as const,
    };

    (mockVideoUploadService.getUpload as any).mockReturnValue(mockUploadState);

    render(<VideoUpload {...defaultProps} />);
    
    // Simulate adding an upload
    const file = new File(['test content'], 'test.mp4', { type: 'video/mp4' });
    const dropZone = screen.getByText(/Drop video files here/).closest('div');
    
    fireEvent.drop(dropZone!, {
      dataTransfer: { files: [file] },
    });

    // Should show processing state
    expect(screen.getByText(/Processing video.../)).toBeInTheDocument();
  });

  it('should call onUploadComplete when upload finishes', () => {
    // Mock upload state with completion
    const mockUploadState = {
      file: new File(['test'], 'test.mp4', { type: 'video/mp4' }),
      progress: {
        loaded: 1024000,
        total: 1024000,
        percentage: 100,
        speed: 0,
        timeRemaining: 0,
      },
      status: 'processing' as const,
      videoId: 'video-123',
    };

    (mockVideoUploadService.getUpload as any).mockReturnValue(mockUploadState);

    render(<VideoUpload {...defaultProps} />);
    
    // Simulate adding an upload
    const file = new File(['test content'], 'test.mp4', { type: 'video/mp4' });
    const dropZone = screen.getByText(/Drop video files here/).closest('div');
    
    fireEvent.drop(dropZone!, {
      dataTransfer: { files: [file] },
    });

    // Should call onUploadComplete
    expect(defaultProps.onUploadComplete).toHaveBeenCalledWith('video-123');
  });
});
