'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { getShowMembers, getShowInvites, revokeInvite, removeMember, Membership, Invite } from '@/lib/shows';

interface ShowManagementProps {
  showId: string;
  showName: string;
  isOwner: boolean;
}

export function ShowManagement({ showId, showName, isOwner }: ShowManagementProps) {
  const [members, setMembers] = useState<Membership[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [membersData, invitesData] = await Promise.all([
        getShowMembers(showId),
        getShowInvites(showId),
      ]);
      
      setMembers(membersData);
      setInvites(invitesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [showId]);

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('Are you sure you want to revoke this invite?')) {
      return;
    }

    try {
      await revokeInvite(inviteId);
      await loadData(); // Reload data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invite');
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this show?`)) {
      return;
    }

    try {
      await removeMember(showId, userId);
      await loadData(); // Reload data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Members Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Members ({members.length})</h3>
        {members.length === 0 ? (
          <p className="text-gray-500 text-sm">No members yet.</p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {member.profiles?.display_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-medium">
                      {member.profiles?.display_name || 'Unknown User'}
                    </p>
                    <p className="text-sm text-gray-500 capitalize">
                      {member.role}
                    </p>
                  </div>
                </div>
                {isOwner && member.role !== 'producer' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveMember(member.user_id, member.profiles?.display_name || 'this user')}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Invites Section */}
      {isOwner && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Pending Invites ({invites.length})</h3>
          {invites.length === 0 ? (
            <p className="text-gray-500 text-sm">No pending invites.</p>
          ) : (
            <div className="space-y-2">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-sm text-gray-500">
                      Invited by {invite.profiles?.display_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(invite.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevokeInvite(invite.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
