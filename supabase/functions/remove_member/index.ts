import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

interface RemoveMemberRequest {
  showId: string;
  userId: string;
}

export async function main(req: Request): Promise<Response> {
  try {
    const { showId, userId }: RemoveMemberRequest = await req.json();

    if (!showId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: showId, userId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user is the owner of the show
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('id, owner_id')
      .eq('id', showId)
      .single();

    if (showError || !show) {
      return new Response(
        JSON.stringify({ error: 'Show not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (show.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Only show owners can remove members' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prevent removing the owner
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot remove the show owner' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if the user is actually a member
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('id, role')
      .eq('show_id', showId)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: 'User is not a member of this show' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Remove the membership
    const { error: deleteError } = await supabase
      .from('memberships')
      .delete()
      .eq('id', membership.id);

    if (deleteError) {
      console.error('Error removing membership:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to remove member' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Member removed successfully',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
