import { getSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // Get all cookies for debugging
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    return Response.json({
      user: user ? {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      } : null,
      error: error?.message || null,
      cookies: allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 20) + '...' }))
    });
  } catch (err) {
    return Response.json({
      error: err instanceof Error ? err.message : 'Unknown error',
      user: null,
      cookies: []
    });
  }
}
