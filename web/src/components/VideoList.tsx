'use client';

import React, { useState, useEffect } from 'react';
import { 
  PlayIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  EyeIcon,
  CalendarIcon,
} from './icons/CommonIcons';
import { Video, getVideos, formatFileSize, formatDuration } from '@/lib/videos';

interface VideoListProps {
  showId: string;
  onVideoSelect?: (video: Video) => void;
}

export function VideoList({ showId, onVideoSelect }: VideoListProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVideos();
  }, [showId]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      const videoList = await getVideos(showId);
      setVideos(videoList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: Video['status']) => {
    switch (status) {
      case 'uploading':
        return <ArrowPathIcon className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'processing':
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      case 'ready':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: Video['status']) => {
    switch (status) {
      case 'uploading':
        return 'Uploading';
      case 'processing':
        return 'Processing';
      case 'ready':
        return 'Ready';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: Video['status']) => {
    switch (status) {
      case 'uploading':
        return 'text-blue-600 bg-blue-100';
      case 'processing':
        return 'text-yellow-600 bg-yellow-100';
      case 'ready':
        return 'text-green-600 bg-green-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading videos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadVideos}
          className="text-blue-600 hover:text-blue-500 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <PlayIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No videos yet</h3>
        <p className="text-gray-600">
          Upload your first video to get started with bookmarking and sharing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Videos</h2>
        <button
          onClick={loadVideos}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Refresh
        </button>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onSelect={onVideoSelect}
            getStatusIcon={getStatusIcon}
            getStatusText={getStatusText}
            getStatusColor={getStatusColor}
            formatDate={formatDate}
          />
        ))}
      </div>
    </div>
  );
}

interface VideoCardProps {
  video: Video;
  onSelect?: (video: Video) => void;
  getStatusIcon: (status: Video['status']) => React.ReactNode;
  getStatusText: (status: Video['status']) => string;
  getStatusColor: (status: Video['status']) => string;
  formatDate: (dateString: string) => string;
}

function VideoCard({ 
  video, 
  onSelect, 
  getStatusIcon, 
  getStatusText, 
  getStatusColor, 
  formatDate 
}: VideoCardProps) {
  const isReady = video.status === 'ready';
  const hasPoster = video.poster_path && isReady;

  return (
    <div 
      className={`
        bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm
        ${isReady ? 'hover:shadow-md cursor-pointer transition-shadow' : ''}
      `}
      onClick={() => isReady && onSelect?.(video)}
    >
      {/* Video Thumbnail/Preview */}
      <div className="aspect-video bg-gray-100 relative">
        {hasPoster ? (
          <img
            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/thumbnails/${video.poster_path}`}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {getStatusIcon(video.status)}
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(video.status)}`}>
            {getStatusIcon(video.status)}
            <span className="ml-1">{getStatusText(video.status)}</span>
          </span>
        </div>

        {/* Play Button for Ready Videos */}
        {isReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black bg-opacity-50 rounded-full p-3">
              <PlayIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 truncate mb-2">
          {video.title}
        </h3>
        
        <div className="space-y-1 text-sm text-gray-600">
          {video.duration_ms && (
            <div className="flex items-center">
              <ClockIcon className="h-4 w-4 mr-1" />
              {formatDuration(video.duration_ms)}
            </div>
          )}
          
          {video.width && video.height && (
            <div className="flex items-center">
              <EyeIcon className="h-4 w-4 mr-1" />
              {video.width} × {video.height}
            </div>
          )}
          
          <div className="flex items-center">
            <CalendarIcon className="h-4 w-4 mr-1" />
            {formatDate(video.created_at)}
          </div>
        </div>

        {video.status === 'error' && (
          <div className="mt-2 text-sm text-red-600">
            Upload failed. Please try again.
          </div>
        )}
      </div>
    </div>
  );
}
