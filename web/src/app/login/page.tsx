import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export default async function LoginPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const envReady = Boolean(supabaseUrl && supabaseAnon);

  let userEmail: string | null = null;
  if (envReady) {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      redirect('/app');
    }
  }

  async function signInWithProvider(formData: FormData) {
    'use server';
    const provider = formData.get('provider') as 'google' | 'facebook';
    if (!envReady) return;
    const supabase = getSupabaseServerClient();
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/app`,
      },
    });
  }

  async function sendMagicLink(formData: FormData) {
    'use server';
    if (!envReady) return;
    const email = String(formData.get('email') || '').trim();
    if (!email) return;
    const supabase = getSupabaseServerClient();
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${origin}/app` } });
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        {!envReady ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
            <p className="font-medium">Project not configured</p>
            <p className="mt-1 text-muted-foreground">
              Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in
              <code>.env.local</code>. See <code>env.example</code> for required variables.
            </p>
          </div>
        ) : null}
        <form action={signInWithProvider} className="grid grid-cols-1 gap-3">
          <button className="btn btn-primary" name="provider" value="google" type="submit">
            Continue with Google
          </button>
          <button className="btn btn-primary" name="provider" value="facebook" type="submit">
            Continue with Facebook
          </button>
        </form>
        <div className="text-center text-sm text-muted-foreground">or</div>
        <form action={sendMagicLink} className="flex gap-2">
          <input
            type="email"
            name="email"
            placeholder="you@example.com"
            required
            className="flex-1 rounded-md border px-3 py-2"
          />
          <button type="submit" className="rounded-md bg-black text-white px-3 py-2">
            Send link
          </button>
        </form>
        <p className="text-xs text-muted-foreground">
          By continuing you agree to our{' '}
          <Link href="#" className="underline">
            Terms
          </Link>
          .
        </p>
      </div>
    </div>
  );
}



