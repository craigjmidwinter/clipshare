import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

interface AcceptInviteRequest {
  token: string;
  role?: 'producer' | 'collaborator';
}

export async function main(req: Request): Promise<Response> {
  try {
    const { token, role = 'collaborator' }: AcceptInviteRequest = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: token' }),
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

    const userToken = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find the invite by token
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select(`
        id,
        show_id,
        email,
        invited_by,
        accepted_at,
        revoked_at,
        created_at,
        shows!inner (
          id,
          name,
          description,
          owner_id
        )
      `)
      .eq('token', token)
      .single();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invite token' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if invite is already accepted or revoked
    if (invite.accepted_at) {
      return new Response(
        JSON.stringify({ error: 'Invite has already been accepted' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (invite.revoked_at) {
      return new Response(
        JSON.stringify({ error: 'Invite has been revoked' }),
        { status: 410, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user's email matches the invite email
    if (user.email !== invite.email) {
      return new Response(
        JSON.stringify({ error: 'Email does not match invite' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is already a member
    const { data: existingMembership } = await supabase
      .from('memberships')
      .select('id')
      .eq('show_id', invite.show_id)
      .eq('user_id', user.id)
      .single();

    if (existingMembership) {
      return new Response(
        JSON.stringify({ error: 'User is already a member of this show' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create membership and mark invite as accepted in a transaction
    const { error: membershipError } = await supabase
      .from('memberships')
      .insert({
        show_id: invite.show_id,
        user_id: user.id,
        role,
      });

    if (membershipError) {
      console.error('Error creating membership:', membershipError);
      return new Response(
        JSON.stringify({ error: 'Failed to create membership' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Mark invite as accepted
    const { error: updateError } = await supabase
      .from('invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id);

    if (updateError) {
      console.error('Error updating invite:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update invite status' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        show: {
          id: invite.shows.id,
          name: invite.shows.name,
          description: invite.shows.description,
        },
        membership: {
          role,
          createdAt: new Date().toISOString(),
        },
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
