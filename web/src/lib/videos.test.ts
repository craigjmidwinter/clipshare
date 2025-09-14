import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getVideos, 
  getVideo, 
  createUploadUrl, 
  completeUpload,
  formatFileSize, 
  formatDuration, 
  validateVideoFile,
  VideoUploadService,
  Video
} from './videos';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  auth: {
    getSession: vi.fn(),
  },
};

// Mock fetch
global.fetch = vi.fn();

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-123'),
  },
  writable: true,
});

vi.mock('./supabase/browser', () => ({
  getSupabaseBrowserClient: () => mockSupabaseClient,
}));

describe('Video Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should handle decimal values', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2097152)).toBe('2 MB');
    });
  });

  describe('formatDuration', () => {
    it('should format duration correctly', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(30000)).toBe('0:30'); // 30 seconds
      expect(formatDuration(90000)).toBe('1:30'); // 1 minute 30 seconds
      expect(formatDuration(3661000)).toBe('1:01:01'); // 1 hour 1 minute 1 second
    });
  });

  describe('validateVideoFile', () => {
    it('should accept valid video files', () => {
      const validFiles = [
        new File([''], 'test.mp4', { type: 'video/mp4' }),
        new File([''], 'test.mov', { type: 'video/quicktime' }),
        new File([''], 'test.avi', { type: 'video/x-msvideo' }),
        new File([''], 'test.webm', { type: 'video/webm' }),
      ];

      validFiles.forEach(file => {
        expect(validateVideoFile(file)).toBeNull();
      });
    });

    it('should reject invalid file types', () => {
      const invalidFiles = [
        new File([''], 'test.txt', { type: 'text/plain' }),
        new File([''], 'test.jpg', { type: 'image/jpeg' }),
        new File([''], 'test.pdf', { type: 'application/pdf' }),
      ];

      invalidFiles.forEach(file => {
        expect(validateVideoFile(file)).toContain('Unsupported file type');
      });
    });

    it('should reject files that are too large', () => {
      const largeFile = new File(['x'.repeat(1024 * 1024 * 1024 + 1)], 'large.mp4', { 
        type: 'video/mp4' 
      });
      expect(validateVideoFile(largeFile)).toContain('File size exceeds 1GB limit');
    });
  });

  describe('getVideos', () => {
    it('should fetch videos for a show', async () => {
      const mockVideos: Video[] = [
        {
          id: '1',
          show_id: 'show-1',
          title: 'Test Video',
          storage_path: 'videos/1/test.mp4',
          duration_ms: 30000,
          width: 1920,
          height: 1080,
          status: 'ready',
          poster_path: 'thumbnails/1/poster.jpg',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockVideos, error: null }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await getVideos('show-1');

      expect(result).toEqual(mockVideos);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('videos');
    });

    it('should handle errors', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      await expect(getVideos('show-1')).rejects.toThrow('Failed to fetch videos: Database error');
    });
  });

  describe('getVideo', () => {
    it('should fetch a single video', async () => {
      const mockVideo: Video = {
        id: '1',
        show_id: 'show-1',
        title: 'Test Video',
        storage_path: 'videos/1/test.mp4',
        duration_ms: 30000,
        width: 1920,
        height: 1080,
        status: 'ready',
        poster_path: 'thumbnails/1/poster.jpg',
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockVideo, error: null }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await getVideo('1');

      expect(result).toEqual(mockVideo);
    });

    it('should return null for non-existent video', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { code: 'PGRST116' } // Not found error
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await getVideo('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createUploadUrl', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });
    });

    it('should create upload URL successfully', async () => {
      const mockResponse = {
        uploadUrl: 'https://storage.supabase.co/upload-url',
        videoId: 'video-123',
        objectKey: 'videos/video-123/test.mp4',
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await createUploadUrl({
        showId: 'show-1',
        fileName: 'test.mp4',
        fileSize: 1024000,
        mimeType: 'video/mp4',
      });

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/create_upload_url'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    it('should handle authentication errors', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      await expect(createUploadUrl({
        showId: 'show-1',
        fileName: 'test.mp4',
        fileSize: 1024000,
        mimeType: 'video/mp4',
      })).rejects.toThrow('Not authenticated');
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'API error' }),
      });

      await expect(createUploadUrl({
        showId: 'show-1',
        fileName: 'test.mp4',
        fileSize: 1024000,
        mimeType: 'video/mp4',
      })).rejects.toThrow('API error');
    });
  });

  describe('completeUpload', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });
    });

    it('should complete upload successfully', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await expect(completeUpload({
        videoId: 'video-123',
        objectKey: 'videos/video-123/test.mp4',
        fileSize: 1024000,
      })).resolves.not.toThrow();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/on_upload_complete'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });
  });

  describe('VideoUploadService', () => {
    let uploadService: VideoUploadService;

    beforeEach(() => {
      uploadService = new VideoUploadService();
    });

    afterEach(() => {
      // Clean up any active uploads
      uploadService['uploads'].clear();
      uploadService['listeners'].clear();
    });

    it('should add upload and return upload ID', () => {
      const file = new File(['test content'], 'test.mp4', { type: 'video/mp4' });
      
      const uploadId = uploadService.addUpload(file, 'show-1');
      
      expect(uploadId).toBeDefined();
      expect(uploadService.getUpload(uploadId)).toBeDefined();
    });

    it('should track upload progress', (done) => {
      const file = new File(['test content'], 'test.mp4', { type: 'video/mp4' });
      const uploadId = uploadService.addUpload(file, 'show-1');
      
      const unsubscribe = uploadService.subscribe(uploadId, (state) => {
        if (state.status === 'uploading' && state.progress.percentage > 0) {
          expect(state.progress.total).toBe(file.size);
          unsubscribe();
          done();
        }
      });
    });

    it('should allow removing uploads', () => {
      const file = new File(['test content'], 'test.mp4', { type: 'video/mp4' });
      const uploadId = uploadService.addUpload(file, 'show-1');
      
      expect(uploadService.getUpload(uploadId)).toBeDefined();
      
      uploadService.removeUpload(uploadId);
      
      expect(uploadService.getUpload(uploadId)).toBeUndefined();
    });

    it('should handle subscription and unsubscription', () => {
      const file = new File(['test content'], 'test.mp4', { type: 'video/mp4' });
      const uploadId = uploadService.addUpload(file, 'show-1');
      
      const callback = vi.fn();
      const unsubscribe = uploadService.subscribe(uploadId, callback);
      
      // Simulate state change
      const upload = uploadService.getUpload(uploadId);
      if (upload) {
        uploadService['notifyListeners'](uploadId, upload);
        expect(callback).toHaveBeenCalled();
      }
      
      // Unsubscribe
      unsubscribe();
      callback.mockClear();
      
      // Simulate another state change
      if (upload) {
        uploadService['notifyListeners'](uploadId, upload);
        expect(callback).not.toHaveBeenCalled();
      }
    });
  });
});
