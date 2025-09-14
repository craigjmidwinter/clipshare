import { getSupabaseServerClient } from './supabase/server';

export async function requireUser() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}


export async function ensureProfile(): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const fullName = (user.user_metadata?.full_name as string | undefined)
    ?? (user.user_metadata?.name as string | undefined)
    ?? user.email
    ?? '';
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined)
    ?? (user.user_metadata?.picture as string | undefined)
    ?? null;

  await supabase
    .from('profiles')
    .upsert({
      user_id: user.id,
      display_name: fullName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    });
}



