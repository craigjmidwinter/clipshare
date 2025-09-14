import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

interface InviteRequest {
  showId: string;
  email: string;
  role?: 'producer' | 'collaborator';
}

export async function main(req: Request): Promise<Response> {
  try {
    const { showId, email, role = 'collaborator' }: InviteRequest = await req.json();

    if (!showId || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: showId, email' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
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
      .select('id, name, owner_id')
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
        JSON.stringify({ error: 'Unauthorized: Only show owners can send invites' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is already a member
    const { data: existingMembership } = await supabase
      .from('memberships')
      .select('id')
      .eq('show_id', showId)
      .eq('user_id', user.id)
      .single();

    if (existingMembership) {
      return new Response(
        JSON.stringify({ error: 'User is already a member of this show' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if there's already a pending invite for this email
    const { data: existingInvite } = await supabase
      .from('invites')
      .select('id')
      .eq('show_id', showId)
      .eq('email', email)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .single();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: 'Invite already sent to this email' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate a unique token for the invite
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const inviteToken = Array.from(tokenBytes, byte => byte.toString(16).padStart(2, '0')).join('');

    // Create the invite
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .insert({
        show_id: showId,
        email,
        token: inviteToken,
        invited_by: user.id,
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invite:', inviteError);
      return new Response(
        JSON.stringify({ error: 'Failed to create invite' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // TODO: Send email notification with invite link
    // For now, we'll just return the invite data
    const inviteLink = `${Deno.env.get('NEXT_PUBLIC_SITE_URL')}/invite/${inviteToken}`;

    return new Response(
      JSON.stringify({
        success: true,
        invite: {
          id: invite.id,
          email: invite.email,
          token: invite.token,
          inviteLink,
          createdAt: invite.created_at,
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
