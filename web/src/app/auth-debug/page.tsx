import { getSupabaseServerClient } from '@/lib/supabase/server';

export default async function AuthDebugPage() {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Try to get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Try to get the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Auth Debug</h1>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">User:</h2>
            <pre className="bg-gray-100 p-2 rounded text-sm">
              {user ? JSON.stringify(user, null, 2) : 'No user'}
            </pre>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Session:</h2>
            <pre className="bg-gray-100 p-2 rounded text-sm">
              {session ? JSON.stringify(session, null, 2) : 'No session'}
            </pre>
          </div>
          <div>
            <h2 className="text-lg font-semibold">User Error:</h2>
            <pre className="bg-gray-100 p-2 rounded text-sm">
              {userError ? JSON.stringify(userError, null, 2) : 'No error'}
            </pre>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Session Error:</h2>
            <pre className="bg-gray-100 p-2 rounded text-sm">
              {sessionError ? JSON.stringify(sessionError, null, 2) : 'No error'}
            </pre>
          </div>
        </div>
      </div>
    );
  } catch (err) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Auth Debug - Error</h1>
        <pre className="bg-red-100 p-2 rounded text-sm">
          {err instanceof Error ? err.message : 'Unknown error'}
        </pre>
      </div>
    );
  }
}
