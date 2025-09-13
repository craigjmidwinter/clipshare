import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { ensureProfile } from '@/lib/auth';

export default async function DashboardPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const envReady = Boolean(supabaseUrl && supabaseAnon);

  if (!envReady) {
    redirect('/login');
  }

  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Ensure a profile row exists/updated for the logged-in user
  await ensureProfile();

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground">Welcome, {user.email}</p>
      <form
        action={async () => {
          'use server';
          const supabase = getSupabaseServerClient();
          await supabase.auth.signOut();
          redirect('/login');
        }}
      >
        <button type="submit" className="rounded-md border px-3 py-2">
          Sign out
        </button>
      </form>
    </div>
  );
}



