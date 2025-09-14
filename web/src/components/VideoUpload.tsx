'use client';

import React, { useState, useCallback, useRef } from 'react';
import { 
  CloudArrowUpIcon, 
  XMarkIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
} from './icons/CommonIcons';
import { videoUploadService, UploadState, validateVideoFile, formatFileSize, formatDuration } from '@/lib/videos';

interface VideoUploadProps {
  showId: string;
  onUploadComplete?: (videoId: string) => void;
  onUploadError?: (error: string) => void;
}

export function VideoUpload({ showId, onUploadComplete, onUploadError }: VideoUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploads, setUploads] = useState<Map<string, UploadState>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((files: FileList) => {
    Array.from(files).forEach(file => {
      const validationError = validateVideoFile(file);
      if (validationError) {
        onUploadError?.(validationError);
        return;
      }

      const uploadId = videoUploadService.addUpload(file, showId);
      
      // Subscribe to upload progress
      const unsubscribe = videoUploadService.subscribe(uploadId, (state) => {
        setUploads(prev => new Map(prev.set(uploadId, state)));
        
        if (state.status === 'processing') {
          onUploadComplete?.(state.videoId!);
        } else if (state.status === 'error') {
          onUploadError?.(state.error!);
        }
      });
    });
  }, [showId, onUploadComplete, onUploadError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    // Reset input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelect]);

  const handleRemoveUpload = useCallback((uploadId: string) => {
    videoUploadService.removeUpload(uploadId);
    setUploads(prev => {
      const newMap = new Map(prev);
      newMap.delete(uploadId);
      return newMap;
    });
  }, []);

  const handleRetryUpload = useCallback((uploadId: string) => {
    const upload = uploads.get(uploadId);
    if (upload && upload.status === 'error') {
      // Remove the failed upload and restart
      videoUploadService.removeUpload(uploadId);
      const newUploadId = videoUploadService.addUpload(upload.file, showId);
      
      // Subscribe to new upload
      const unsubscribe = videoUploadService.subscribe(newUploadId, (state) => {
        setUploads(prev => {
          const newMap = new Map(prev);
          newMap.delete(uploadId); // Remove old upload
          newMap.set(newUploadId, state); // Add new upload
          return newMap;
        });
        
        if (state.status === 'processing') {
          onUploadComplete?.(state.videoId!);
        } else if (state.status === 'error') {
          onUploadError?.(state.error!);
        }
      });
    }
  }, [uploads, showId, onUploadComplete, onUploadError]);

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4">
          <label htmlFor="file-upload" className="cursor-pointer">
            <span className="mt-2 block text-sm font-medium text-gray-900">
              Drop video files here, or{' '}
              <span className="text-blue-600 hover:text-blue-500">
                browse to upload
              </span>
            </span>
            <span className="mt-1 block text-xs text-gray-500">
              MP4, MOV, AVI, WebM up to 1GB
            </span>
          </label>
          <input
            ref={fileInputRef}
            id="file-upload"
            name="file-upload"
            type="file"
            multiple
            accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
            className="sr-only"
            onChange={handleFileInputChange}
          />
        </div>
        <button
          type="button"
          onClick={openFileDialog}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <CloudArrowUpIcon className="h-4 w-4 mr-2" />
          Choose Files
        </button>
      </div>

      {/* Upload Progress */}
      {uploads.size > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">Upload Progress</h3>
          {Array.from(uploads.entries()).map(([uploadId, upload]) => (
            <UploadProgressItem
              key={uploadId}
              uploadId={uploadId}
              upload={upload}
              onRemove={handleRemoveUpload}
              onRetry={handleRetryUpload}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface UploadProgressItemProps {
  uploadId: string;
  upload: UploadState;
  onRemove: (uploadId: string) => void;
  onRetry: (uploadId: string) => void;
}

function UploadProgressItem({ uploadId, upload, onRemove, onRetry }: UploadProgressItemProps) {
  const { progress, status, error, file } = upload;

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
      case 'uploading':
        return <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'processing':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Preparing...';
      case 'uploading':
        return `Uploading... ${progress.percentage}%`;
      case 'processing':
        return 'Processing video...';
      case 'completed':
        return 'Upload complete';
      case 'error':
        return `Error: ${error}`;
      default:
        return '';
    }
  };

  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTimeRemaining = (seconds: number) => {
    if (seconds === 0 || !isFinite(seconds)) return '';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return ` (${minutes}:${remainingSeconds.toString().padStart(2, '0')} remaining)`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900 truncate">
                {file.name}
              </p>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">
                  {formatFileSize(file.size)}
                </span>
                {status !== 'completed' && status !== 'error' && (
                  <button
                    onClick={() => onRemove(uploadId)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="mt-1">
              <p className="text-sm text-gray-600">
                {getStatusText()}
              </p>
              
              {status === 'uploading' && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{formatSpeed(progress.speed)}</span>
                    <span>
                      {formatFileSize(progress.loaded)} / {formatFileSize(progress.total)}
                      {formatTimeRemaining(progress.timeRemaining)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                </div>
              )}
              
              {status === 'error' && (
                <div className="mt-2">
                  <button
                    onClick={() => onRetry(uploadId)}
                    className="text-xs text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Retry upload
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
