import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

interface RevokeInviteRequest {
  inviteId: string;
}

export async function main(req: Request): Promise<Response> {
  try {
    const { inviteId }: RevokeInviteRequest = await req.json();

    if (!inviteId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: inviteId' }),
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

    // Find the invite and verify ownership
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select(`
        id,
        show_id,
        email,
        accepted_at,
        revoked_at,
        shows!inner (
          id,
          owner_id
        )
      `)
      .eq('id', inviteId)
      .single();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: 'Invite not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user is the owner of the show
    if (invite.shows.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Only show owners can revoke invites' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if invite is already accepted or revoked
    if (invite.accepted_at) {
      return new Response(
        JSON.stringify({ error: 'Cannot revoke an accepted invite' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (invite.revoked_at) {
      return new Response(
        JSON.stringify({ error: 'Invite has already been revoked' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Revoke the invite
    const { error: updateError } = await supabase
      .from('invites')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', inviteId);

    if (updateError) {
      console.error('Error revoking invite:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to revoke invite' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invite revoked successfully',
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
