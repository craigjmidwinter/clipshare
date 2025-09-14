'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { CreateShowModal } from '@/components/CreateShowModal';
import { InviteCollaboratorModal } from '@/components/InviteCollaboratorModal';
import { ShowCard } from '@/components/ShowCard';
import { ShowManagement } from '@/components/ShowManagement';
import { getShows, getShowMembers, Show } from '@/lib/shows';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export function DashboardClient() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [shows, setShows] = useState<Show[]>([]);
  const [showMembers, setShowMembers] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedShow, setSelectedShow] = useState<{ id: string; name: string } | null>(null);
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const supabase = getSupabaseBrowserClient();

  // Client-side profile creation
  const ensureProfile = async (user: any) => {
    try {
      const fullName = (user.user_metadata?.full_name as string | undefined)
        ?? (user.user_metadata?.name as string | undefined)
        ?? user.email
        ?? '';
      const avatarUrl = (user.user_metadata?.avatar_url as string | undefined)
        ?? (user.user_metadata?.picture as string | undefined)
        ?? null;

      console.log('Creating/updating profile for user:', user.id);
      
      // Add a timeout to prevent hanging
      const profilePromise = supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          display_name: fullName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile creation timeout')), 5000)
      );

      const { error } = await Promise.race([profilePromise, timeoutPromise]) as any;

      if (error) {
        console.error('Profile creation error:', error);
        // Don't throw error, just log it and continue
        console.log('Continuing despite profile error...');
      } else {
        console.log('Profile created/updated successfully for user:', user.id);
      }
    } catch (error) {
      console.error('Error in ensureProfile:', error);
      // Don't throw error, just log it and continue
      console.log('Continuing despite profile error...');
    }
  };

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First try to get the current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('Found existing session for user:', session.user.id);
          setUser(session.user);
          console.log('User state set from session:', session.user.id);
          
          // Create profile in background (don't await)
          ensureProfile(session.user).catch(error => {
            console.error('Background profile creation error:', error);
          });
          return;
        }
        
        // If no session, try to get user directly
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log('Found user:', user.id);
          setUser(user);
          console.log('User state set from getUser:', user.id);
          
          // Create profile in background (don't await)
          ensureProfile(user).catch(error => {
            console.error('Background profile creation error:', error);
          });
        } else {
          console.log('No user found, redirecting to login');
          router.push('/login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/login');
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();

    // Add a timeout to handle cases where auth state change might not fire
    const timeoutId = setTimeout(() => {
      if (!authChecked) {
        console.log('Auth check timeout, checking again...');
        checkAuth();
      }
    }, 2000);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.id);
      
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        router.push('/login');
      } else if (session?.user) {
        // Set user immediately, then create profile in background
        setUser(session.user);
        console.log('User state set from auth state change:', session.user.id);
        
        // Create profile in background (don't await)
        ensureProfile(session.user).catch(error => {
          console.error('Background profile creation error:', error);
        });
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [router, supabase.auth]);

  const loadShows = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const showsData = await getShows();
      setShows(showsData);
      
      // Load member counts for each show
      const memberCounts: Record<string, number> = {};
      for (const show of showsData) {
        const members = await getShowMembers(show.id);
        memberCounts[show.id] = members.length;
      }
      setShowMembers(memberCounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shows');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadShows();
    }
  }, [user]);

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleShowCreated = (newShow: Show) => {
    setShows(prev => [newShow, ...prev]);
    setShowMembers(prev => ({ ...prev, [newShow.id]: 1 }));
  };

  const handleInviteClick = (showId: string, showName: string) => {
    setSelectedShow({ id: showId, name: showName });
    setShowInviteModal(true);
  };

  const handleShowClick = (showId: string) => {
    setSelectedShowId(showId);
  };

  const handleInviteSent = () => {
    loadShows(); // Reload to update member counts
  };

  const handleBackToDashboard = () => {
    setSelectedShowId(null);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedShowId) {
    const show = shows.find(s => s.id === selectedShowId);
    if (!show) {
      return (
        <div className="p-6">
          <Button onClick={handleBackToDashboard} variant="outline">
            ← Back to Dashboard
          </Button>
          <p className="mt-4 text-red-600">Show not found</p>
        </div>
      );
    }

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button onClick={handleBackToDashboard} variant="outline">
              ← Back to Dashboard
            </Button>
            <h1 className="text-2xl font-semibold mt-4">{show.name}</h1>
            {show.description && (
              <p className="text-gray-600 mt-1">{show.description}</p>
            )}
          </div>
          {show.owner_id === user.id && (
            <Button onClick={() => handleInviteClick(show.id, show.name)}>
              Invite Collaborator
            </Button>
          )}
        </div>

        <ShowManagement 
          showId={show.id} 
          showName={show.name} 
          isOwner={show.owner_id === user.id}
        />
      </div>
    );
  }

  // Debug logging
  console.log('DashboardClient render - user:', user?.id, 'authChecked:', authChecked);

  // Show loading state while checking authentication
  if (!user && !authChecked) {
    console.log('Showing authenticating state');
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Authenticating...</p>
          </div>
        </div>
      </div>
    );
  }

  // If auth is checked but no user, show a brief loading state before redirect
  if (!user && authChecked) {
    console.log('Showing redirecting state');
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-gray-600">Welcome, {user.email}</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={() => setShowCreateModal(true)}>
            Create Show
          </Button>
          <Button onClick={handleSignOut} variant="outline">
            Sign out
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">Your Shows ({shows.length})</h2>
        {shows.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No shows yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first show.</p>
            <div className="mt-6">
              <Button onClick={() => setShowCreateModal(true)}>
                Create Show
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shows.map((show) => (
              <ShowCard
                key={show.id}
                show={show}
                memberCount={showMembers[show.id] || 0}
                isOwner={show.owner_id === user.id}
                onShowClick={handleShowClick}
                onInviteClick={handleInviteClick}
              />
            ))}
          </div>
        )}
      </div>

      <CreateShowModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onShowCreated={handleShowCreated}
      />

      <InviteCollaboratorModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        showId={selectedShow?.id || ''}
        showName={selectedShow?.name || ''}
        onInviteSent={handleInviteSent}
      />
    </div>
  );
}
