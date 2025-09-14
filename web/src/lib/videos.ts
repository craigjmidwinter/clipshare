import { getSupabaseBrowserClient } from './supabase/browser';

export interface Video {
  id: string;
  show_id: string;
  title: string;
  storage_path: string;
  duration_ms: number | null;
  width: number | null;
  height: number | null;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  poster_path: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
  timeRemaining: number; // seconds
}

export interface UploadState {
  file: File;
  videoId?: string;
  progress: UploadProgress;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface CreateUploadUrlResponse {
  uploadUrl: string;
  videoId: string;
  objectKey: string;
}

export interface CreateUploadUrlRequest {
  showId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface UploadCompleteRequest {
  videoId: string;
  objectKey: string;
  fileSize: number;
}

// Video management functions
export async function getVideos(showId: string): Promise<Video[]> {
  const supabase = getSupabaseBrowserClient();
  
  const { data: videos, error } = await supabase
    .from('videos')
    .select(`
      id,
      show_id,
      title,
      storage_path,
      duration_ms,
      width,
      height,
      status,
      poster_path,
      created_by,
      created_at,
      updated_at
    `)
    .eq('show_id', showId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch videos: ${error.message}`);
  }

  return videos || [];
}

export async function getVideo(videoId: string): Promise<Video | null> {
  const supabase = getSupabaseBrowserClient();
  
  const { data: video, error } = await supabase
    .from('videos')
    .select(`
      id,
      show_id,
      title,
      storage_path,
      duration_ms,
      width,
      height,
      status,
      poster_path,
      created_by,
      created_at,
      updated_at
    `)
    .eq('id', videoId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch video: ${error.message}`);
  }

  return video;
}

// Upload functions
export async function createUploadUrl(request: CreateUploadUrlRequest): Promise<CreateUploadUrlResponse> {
  const supabase = getSupabaseBrowserClient();
  
  // Get the session to pass auth token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create_upload_url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create upload URL');
  }

  return response.json();
}

export async function completeUpload(request: UploadCompleteRequest): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  
  // Get the session to pass auth token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/on_upload_complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to complete upload');
  }
}

// Utility functions
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  }
}

export function validateVideoFile(file: File): string | null {
  // Check file type
  const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
  if (!allowedTypes.includes(file.type)) {
    return 'Unsupported file type. Please upload MP4, MOV, AVI, or WebM files.';
  }

  // Check file size (1GB limit)
  const maxSize = 1024 * 1024 * 1024; // 1GB
  if (file.size > maxSize) {
    return 'File size exceeds 1GB limit.';
  }

  return null;
}

// Upload service class for managing uploads
export class VideoUploadService {
  private uploads: Map<string, UploadState> = new Map();
  private listeners: Map<string, ((state: UploadState) => void)[]> = new Map();

  addUpload(file: File, showId: string): string {
    const uploadId = crypto.randomUUID();
    
    const uploadState: UploadState = {
      file,
      progress: {
        loaded: 0,
        total: file.size,
        percentage: 0,
        speed: 0,
        timeRemaining: 0,
      },
      status: 'pending',
    };

    this.uploads.set(uploadId, uploadState);
    this.notifyListeners(uploadId, uploadState);
    
    // Start upload
    this.startUpload(uploadId, showId);
    
    return uploadId;
  }

  getUpload(uploadId: string): UploadState | undefined {
    return this.uploads.get(uploadId);
  }

  removeUpload(uploadId: string): void {
    this.uploads.delete(uploadId);
    this.listeners.delete(uploadId);
  }

  subscribe(uploadId: string, callback: (state: UploadState) => void): () => void {
    if (!this.listeners.has(uploadId)) {
      this.listeners.set(uploadId, []);
    }
    
    this.listeners.get(uploadId)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(uploadId);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  private notifyListeners(uploadId: string, state: UploadState): void {
    const listeners = this.listeners.get(uploadId);
    if (listeners) {
      listeners.forEach(callback => callback(state));
    }
  }

  private async startUpload(uploadId: string, showId: string): Promise<void> {
    const uploadState = this.uploads.get(uploadId);
    if (!uploadState) return;

    try {
      uploadState.status = 'uploading';
      this.notifyListeners(uploadId, uploadState);

      // Create upload URL
      const uploadUrlResponse = await createUploadUrl({
        showId,
        fileName: uploadState.file.name,
        fileSize: uploadState.file.size,
        mimeType: uploadState.file.type,
      });

      uploadState.videoId = uploadUrlResponse.videoId;

      // Upload file with progress tracking
      await this.uploadFile(uploadId, uploadUrlResponse.uploadUrl, uploadState.file);

      // Complete upload
      await completeUpload({
        videoId: uploadState.videoId,
        objectKey: uploadUrlResponse.objectKey,
        fileSize: uploadState.file.size,
      });

      uploadState.status = 'processing';
      this.notifyListeners(uploadId, uploadState);

    } catch (error) {
      uploadState.status = 'error';
      uploadState.error = error instanceof Error ? error.message : 'Upload failed';
      this.notifyListeners(uploadId, uploadState);
    }
  }

  private async uploadFile(uploadId: string, uploadUrl: string, file: File): Promise<void> {
    const uploadState = this.uploads.get(uploadId);
    if (!uploadState) return;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const startTime = Date.now();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const loaded = event.loaded;
          const total = event.total;
          const percentage = Math.round((loaded / total) * 100);
          
          // Calculate speed
          const elapsed = (Date.now() - startTime) / 1000; // seconds
          const speed = loaded / elapsed; // bytes per second
          
          // Calculate time remaining
          const remaining = total - loaded;
          const timeRemaining = speed > 0 ? remaining / speed : 0;

          uploadState.progress = {
            loaded,
            total,
            percentage,
            speed,
            timeRemaining,
          };

          this.notifyListeners(uploadId, uploadState);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }
}

// Global upload service instance
export const videoUploadService = new VideoUploadService();
