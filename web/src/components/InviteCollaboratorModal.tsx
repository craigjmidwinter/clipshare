'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { sendInvite } from '@/lib/shows';

interface InviteCollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  showId: string;
  showName: string;
  onInviteSent: () => void;
}

export function InviteCollaboratorModal({ 
  isOpen, 
  onClose, 
  showId, 
  showName, 
  onInviteSent 
}: InviteCollaboratorModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'producer' | 'collaborator'>('collaborator');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await sendInvite({
        showId,
        email: email.trim(),
        role,
      });
      
      setSuccess(`Invite sent to ${email}! Share this link: ${result.inviteLink}`);
      setEmail('');
      onInviteSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setEmail('');
      setRole('collaborator');
      setError(null);
      setSuccess(null);
      onClose();
    }
  };

  const copyInviteLink = () => {
    if (success) {
      const link = success.split('Share this link: ')[1];
      navigator.clipboard.writeText(link);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Invite Collaborator</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Show:</strong> {showName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="collaborator@example.com"
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'producer' | 'collaborator')}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="collaborator">Collaborator</option>
              <option value="producer">Producer</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Collaborators can view videos and create bookmarks. Producers can manage the show and invite others.
            </p>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">
              <p className="mb-2">{success.split(' Share this link: ')[0]}</p>
              <div className="flex items-center space-x-2">
                <code className="text-xs bg-white p-2 rounded border flex-1 break-all">
                  {success.split('Share this link: ')[1]}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyInviteLink}
                >
                  Copy
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              {success ? 'Close' : 'Cancel'}
            </Button>
            {!success && (
              <Button
                type="submit"
                disabled={isLoading || !email.trim()}
              >
                {isLoading ? 'Sending...' : 'Send Invite'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
