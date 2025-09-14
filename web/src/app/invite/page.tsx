'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { acceptInvite } from '@/lib/shows';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function InviteAcceptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState<{ name: string; description: string | null } | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid invite link');
      return;
    }

    // Check if user is authenticated
    const checkAuth = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Redirect to login with return URL
        router.push(`/login?redirect=${encodeURIComponent(window.location.href)}`);
        return;
      }
    };

    checkAuth();
  }, [token, router]);

  const handleAcceptInvite = async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await acceptInvite(token);
      setSuccess(`Successfully joined "${result.show.name}"!`);
      setShowInfo(result.show);
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/app');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Invalid Invite</h2>
            <p className="mt-2 text-gray-600">This invite link is invalid or has expired.</p>
            <Button 
              onClick={() => router.push('/app')} 
              className="mt-4"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          {success ? (
            <>
              <svg className="mx-auto h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">Welcome!</h2>
              <p className="mt-2 text-gray-600">{success}</p>
              {showInfo && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900">{showInfo.name}</h3>
                  {showInfo.description && (
                    <p className="text-sm text-blue-700 mt-1">{showInfo.description}</p>
                  )}
                </div>
              )}
              <p className="mt-4 text-sm text-gray-500">Redirecting to dashboard...</p>
            </>
          ) : (
            <>
              <svg className="mx-auto h-12 w-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">You're Invited!</h2>
              <p className="mt-2 text-gray-600">
                You've been invited to collaborate on a show. Click below to accept the invitation.
              </p>
              
              {error && (
                <div className="mt-4 text-red-600 text-sm bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}
              
              <div className="mt-6">
                <Button
                  onClick={handleAcceptInvite}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Accepting...' : 'Accept Invitation'}
                </Button>
              </div>
              
              <div className="mt-4">
                <Button
                  onClick={() => router.push('/app')}
                  variant="outline"
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
