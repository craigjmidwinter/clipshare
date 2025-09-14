'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Show, formatDate } from '@/lib/shows';

interface ShowCardProps {
  show: Show;
  memberCount: number;
  isOwner: boolean;
  onShowClick: (showId: string) => void;
  onInviteClick: (showId: string, showName: string) => void;
}

export function ShowCard({ 
  show, 
  memberCount, 
  isOwner, 
  onShowClick, 
  onInviteClick 
}: ShowCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onShowClick(show.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {show.name}
          </h3>
          {show.description && (
            <p className="text-gray-600 text-sm mb-2 line-clamp-2">
              {show.description}
            </p>
          )}
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
            <span>Created {formatDate(show.created_at)}</span>
            {isOwner && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Owner
              </span>
            )}
          </div>
        </div>
        
        {isOwner && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onInviteClick(show.id, show.name);
            }}
            className="ml-4"
          >
            Invite
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Last updated {formatDate(show.updated_at)}</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
