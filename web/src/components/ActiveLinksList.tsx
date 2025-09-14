'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { QRCodeDisplay } from './QRCodeDisplay';

interface SecureLink {
  id: string;
  token: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  revoked_at: string | null;
  created_at: string;
}

interface ActiveLinksListProps {
  videoId: string;
  onLinkRevoked: () => void;
}

export function ActiveLinksList({ videoId, onLinkRevoked }: ActiveLinksListProps) {
  const [links, setLinks] = useState<SecureLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveLinks();
  }, [videoId]);

  const fetchActiveLinks = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('secure_links')
        .select('*')
        .eq('video_id', videoId)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setLinks(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch links');
    } finally {
      setLoading(false);
    }
  };

  const revokeLink = async (linkId: string) => {
    setRevokingId(linkId);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('secure_links')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', linkId);

      if (error) {
        throw error;
      }

      // Remove the revoked link from the list
      setLinks(prev => prev.filter(link => link.id !== linkId));
      onLinkRevoked();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke link');
    } finally {
      setRevokingId(null);
    }
  };

  const copyToClipboard = async (token: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const linkUrl = `${baseUrl}/secure/${token}`;
    
    try {
      await navigator.clipboard.writeText(linkUrl);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const formatTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return 'Never expires';
    
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const getUsageText = (link: SecureLink) => {
    if (link.max_uses === null) {
      return `${link.use_count} uses`;
    }
    return `${link.use_count}/${link.max_uses} uses`;
  };

  if (loading) {
    return (
      <div className="rounded-md border p-4">
        <h3 className="font-semibold mb-3">Active Secure Links</h3>
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border p-4">
        <h3 className="font-semibold mb-3">Active Secure Links</h3>
        <div className="text-sm text-destructive">{error}</div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchActiveLinks}
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-md border p-4">
      <h3 className="font-semibold mb-3">Active Secure Links</h3>
      
      {links.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No active secure links. Generate one to share this video securely.
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div key={link.id} className="p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    Created {new Date(link.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatTimeRemaining(link.expires_at)} • {getUsageText(link)}
                  </div>
                </div>
                <div className="flex gap-2 ml-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(link.token)}
                    className="text-xs"
                  >
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => revokeLink(link.id)}
                    loading={revokingId === link.id}
                    disabled={revokingId === link.id}
                    className="text-xs text-destructive hover:text-destructive"
                  >
                    Revoke
                  </Button>
                </div>
              </div>
              
              {/* QR Code */}
              <div className="mt-2">
                <QRCodeDisplay 
                  url={`${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/secure/${link.token}`}
                  size={120}
                  className="w-full"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
