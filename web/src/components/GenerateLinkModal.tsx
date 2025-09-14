'use client';

import { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

interface GenerateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  onLinkGenerated: (link: string) => void;
}

interface SecureLinkFormData {
  expiresAt: string;
  maxUses: string;
  singleUse: boolean;
}

export function GenerateLinkModal({ isOpen, onClose, videoId, onLinkGenerated }: GenerateLinkModalProps) {
  const [formData, setFormData] = useState<SecureLinkFormData>({
    expiresAt: '',
    maxUses: '',
    singleUse: false,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing');
      }

      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const requestBody: any = {
        video_id: videoId,
      };

      // Add expiry date if provided
      if (formData.expiresAt) {
        requestBody.expires_at = formData.expiresAt;
      }

      // Add max uses if single use is enabled or max uses is specified
      if (formData.singleUse) {
        requestBody.max_uses = 1;
      } else if (formData.maxUses) {
        requestBody.max_uses = parseInt(formData.maxUses, 10);
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/generate_secure_link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate secure link');
      }

      onLinkGenerated(result.link);
      onClose();
      
      // Reset form
      setFormData({
        expiresAt: '',
        maxUses: '',
        singleUse: false,
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInputChange = (field: keyof SecureLinkFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  // Calculate minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().slice(0, 16);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-xl border-2 border-border shadow-modern-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Generate Secure Link</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={isGenerating}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">
              Expiry Date & Time (Optional)
            </label>
            <Input
              type="datetime-local"
              value={formData.expiresAt}
              onChange={(e) => handleInputChange('expiresAt', e.target.value)}
              min={minDate}
              placeholder="Select expiry date and time"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for no expiry. Link will be valid indefinitely until revoked.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="singleUse"
                checked={formData.singleUse}
                onChange={(e) => handleInputChange('singleUse', e.target.checked)}
                className="w-4 h-4 text-primary bg-background border-2 border-input rounded focus:ring-primary focus:ring-2"
                disabled={isGenerating}
              />
              <label htmlFor="singleUse" className="text-sm font-semibold text-foreground">
                Single-use link
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Link will be invalidated after first use.
            </p>
          </div>

          {!formData.singleUse && (
            <div className="space-y-3">
              <Input
                label="Maximum Uses (Optional)"
                type="number"
                value={formData.maxUses}
                onChange={(e) => handleInputChange('maxUses', e.target.value)}
                min="1"
                placeholder="Enter maximum number of uses"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for unlimited uses.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isGenerating}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isGenerating}
              disabled={isGenerating}
              className="flex-1"
            >
              Generate Link
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
