import { getSupabaseServerClient } from '@/lib/supabase/server';

export default async function AuthTestPage() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Auth Test</h1>
        <div className="space-y-2">
          <p><strong>User:</strong> {user ? JSON.stringify(user, null, 2) : 'No user'}</p>
          <p><strong>Error:</strong> {error ? JSON.stringify(error, null, 2) : 'No error'}</p>
        </div>
      </div>
    );
  } catch (err) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Auth Test - Error</h1>
        <p><strong>Error:</strong> {err instanceof Error ? err.message : 'Unknown error'}</p>
      </div>
    );
  }
}
