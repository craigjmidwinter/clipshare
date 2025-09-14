'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { GenerateLinkModal } from '@/components/GenerateLinkModal';
import { ActiveLinksList } from '@/components/ActiveLinksList';

interface VideoControlsProps {
  videoId: string;
  isProducer: boolean;
}

export function VideoControls({ videoId, isProducer }: VideoControlsProps) {
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);

  const handleLinkGenerated = (link: string) => {
    setGeneratedLink(link);
    setShowCopiedMessage(true);
    setTimeout(() => setShowCopiedMessage(false), 3000);
  };

  const handleModalClose = () => {
    setShowGenerateModal(false);
    setGeneratedLink(null);
    setShowCopiedMessage(false);
  };

  const copyGeneratedLink = async () => {
    if (generatedLink) {
      try {
        await navigator.clipboard.writeText(generatedLink);
        setShowCopiedMessage(true);
        setTimeout(() => setShowCopiedMessage(false), 3000);
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    }
  };

  if (!isProducer) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Generate Link Section */}
      <div className="rounded-md border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Share Video Securely</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGenerateModal(true)}
          >
            Generate Secure Link
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Create a secure link to share this video with collaborators. Links can have expiry dates and usage limits.
        </p>
        
        {generatedLink && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-800">Link Generated Successfully!</span>
              <Button
                variant="outline"
                size="sm"
                onClick={copyGeneratedLink}
                className="text-xs"
              >
                {showCopiedMessage ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>
            <div className="text-xs text-green-700 font-mono break-all">
              {generatedLink}
            </div>
          </div>
        )}
      </div>

      {/* Active Links List */}
      <ActiveLinksList 
        videoId={videoId} 
        onLinkRevoked={() => {
          // Refresh the list or show a notification
          setGeneratedLink(null);
        }} 
      />

      {/* Generate Link Modal */}
      <GenerateLinkModal
        isOpen={showGenerateModal}
        onClose={handleModalClose}
        videoId={videoId}
        onLinkGenerated={handleLinkGenerated}
      />
    </div>
  );
}
