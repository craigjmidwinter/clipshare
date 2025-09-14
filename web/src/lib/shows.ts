import { getSupabaseBrowserClient } from './supabase/browser';

export interface Show {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  show_id: string;
  user_id: string;
  role: 'producer' | 'collaborator';
  created_at: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface Invite {
  id: string;
  show_id: string;
  email: string;
  token: string;
  invited_by: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  shows?: {
    name: string;
    description: string | null;
  };
  profiles?: {
    display_name: string | null;
  };
}

export interface CreateShowData {
  name: string;
  description?: string;
}

export interface SendInviteData {
  showId: string;
  email: string;
  role?: 'producer' | 'collaborator';
}

// Show management functions
export async function createShow(data: CreateShowData): Promise<Show> {
  const supabase = getSupabaseBrowserClient();
  
  const { data: show, error } = await supabase
    .from('shows')
    .insert({
      name: data.name,
      description: data.description || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create show: ${error.message}`);
  }

  return show;
}

export async function getShows(): Promise<Show[]> {
  const supabase = getSupabaseBrowserClient();
  
  const { data: shows, error } = await supabase
    .from('shows')
    .select(`
      id,
      name,
      description,
      owner_id,
      created_at,
      updated_at
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch shows: ${error.message}`);
  }

  return shows || [];
}

export async function getShowMembers(showId: string): Promise<Membership[]> {
  const supabase = getSupabaseBrowserClient();
  
  const { data: memberships, error } = await supabase
    .from('memberships')
    .select(`
      id,
      show_id,
      user_id,
      role,
      created_at,
      profiles!inner (
        display_name,
        avatar_url
      )
    `)
    .eq('show_id', showId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch show members: ${error.message}`);
  }

  return memberships || [];
}

export async function getShowInvites(showId: string): Promise<Invite[]> {
  const supabase = getSupabaseBrowserClient();
  
  const { data: invites, error } = await supabase
    .from('invites')
    .select(`
      id,
      show_id,
      email,
      token,
      invited_by,
      accepted_at,
      revoked_at,
      created_at,
      profiles!inner (
        display_name
      )
    `)
    .eq('show_id', showId)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch show invites: ${error.message}`);
  }

  return invites || [];
}

// Invite management functions
export async function sendInvite(data: SendInviteData): Promise<{ invite: any; inviteLink: string }> {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch('/api/supabase/functions/send_invite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send invite');
  }

  return await response.json();
}

export async function acceptInvite(token: string, role: 'producer' | 'collaborator' = 'collaborator'): Promise<{ show: Show; membership: any }> {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch('/api/supabase/functions/accept_invite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ token, role }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to accept invite');
  }

  return await response.json();
}

export async function revokeInvite(inviteId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch('/api/supabase/functions/revoke_invite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ inviteId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to revoke invite');
  }
}

export async function removeMember(showId: string, userId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch('/api/supabase/functions/remove_member', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ showId, userId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove member');
  }
}

// Utility functions
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
