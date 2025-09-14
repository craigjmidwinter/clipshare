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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-xl w-1/4"></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedShowId) {
    const show = shows.find(s => s.id === selectedShowId);
    if (!show) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="glass rounded-2xl p-8 shadow-modern-xl">
              <Button onClick={handleBackToDashboard} variant="outline" className="hover-lift">
                ← Back to Dashboard
              </Button>
              <div className="mt-6 p-6 rounded-xl bg-destructive/5 border-2 border-destructive/20">
                <p className="text-destructive font-semibold">Show not found</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="glass rounded-2xl p-8 shadow-modern-xl">
            <div className="flex items-center justify-between">
              <div>
                <Button onClick={handleBackToDashboard} variant="outline" className="hover-lift mb-4">
                  ← Back to Dashboard
                </Button>
                <h1 className="text-3xl font-bold text-foreground mb-2">{show.name}</h1>
                {show.description && (
                  <p className="text-muted-foreground text-lg">{show.description}</p>
                )}
              </div>
              {show.owner_id === user.id && (
                <Button onClick={() => handleInviteClick(show.id, show.name)} variant="gradient" className="hover-lift">
                  Invite Collaborator
                </Button>
              )}
            </div>
          </div>

          <div className="glass rounded-2xl p-8 shadow-modern-xl">
            <ShowManagement 
              showId={show.id} 
              showName={show.name} 
              isOwner={show.owner_id === user.id}
            />
          </div>
        </div>
      </div>
    );
  }

  // Debug logging
  console.log('DashboardClient render - user:', user?.id, 'authChecked:', authChecked);

  // Show loading state while checking authentication
  if (!user && !authChecked) {
    console.log('Showing authenticating state');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="glass rounded-2xl p-8 shadow-modern-xl text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">Authenticating...</p>
        </div>
      </div>
    );
  }

  // If auth is checked but no user, show a brief loading state before redirect
  if (!user && authChecked) {
    console.log('Showing redirecting state');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="glass rounded-2xl p-8 shadow-modern-xl text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="glass rounded-2xl p-8 shadow-modern-xl animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
              <p className="text-muted-foreground text-lg">Welcome back, {user.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => setShowCreateModal(true)} variant="gradient" className="hover-lift btn-hover-scale">
                Create Show
              </Button>
              <Button onClick={handleSignOut} variant="outline" className="hover-lift btn-hover-scale">
                Sign out
              </Button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="glass rounded-2xl p-6 shadow-modern-xl border-2 border-destructive/20 bg-destructive/5">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-destructive flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-destructive font-semibold">{error}</p>
            </div>
          </div>
        )}

        {/* Shows Section */}
        <div className="glass rounded-2xl p-8 shadow-modern-xl animate-fade-in-up stagger-1">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-foreground">Your Shows ({shows.length})</h2>
          </div>
          
          {shows.length === 0 ? (
            <div className="text-center py-16 animate-fade-in-scale">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl mb-6 animate-pulse-glow">
                <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No shows yet</h3>
              <p className="text-muted-foreground mb-8">Get started by creating your first show.</p>
              <Button onClick={() => setShowCreateModal(true)} variant="gradient" size="lg" className="hover-lift btn-hover-glow">
                Create Show
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {shows.map((show, index) => (
                <div key={show.id} className={`animate-fade-in-up stagger-${Math.min(index + 1, 5)}`}>
                  <ShowCard
                    show={show}
                    memberCount={showMembers[show.id] || 0}
                    isOwner={show.owner_id === user.id}
                    onShowClick={handleShowClick}
                    onInviteClick={handleInviteClick}
                  />
                </div>
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
    </div>
  );
}
