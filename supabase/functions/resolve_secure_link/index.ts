import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResolveSecureLinkRequest {
  token: string;
}

interface ResolveSecureLinkResponse {
  success: boolean;
  video?: {
    id: string;
    title: string;
    storage_path: string;
    duration_ms: number;
    width: number;
    height: number;
    poster_path: string;
  };
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { token }: ResolveSecureLinkRequest = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Find the secure link record
    const { data: secureLink, error: linkError } = await supabaseClient
      .from('secure_links')
      .select(`
        id,
        video_id,
        expires_at,
        max_uses,
        use_count,
        revoked_at,
        videos!inner(
          id,
          title,
          storage_path,
          duration_ms,
          width,
          height,
          poster_path
        )
      `)
      .eq('token', token)
      .single();

    if (linkError || !secureLink) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired link' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if link is revoked
    if (secureLink.revoked_at) {
      return new Response(
        JSON.stringify({ success: false, error: 'Link has been revoked' }),
        { 
          status: 410, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if link has expired
    if (secureLink.expires_at) {
      const expiryDate = new Date(secureLink.expires_at);
      if (new Date() > expiryDate) {
        return new Response(
          JSON.stringify({ success: false, error: 'Link has expired' }),
          { 
            status: 410, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Check if link has exceeded max uses
    if (secureLink.max_uses && secureLink.use_count >= secureLink.max_uses) {
      return new Response(
        JSON.stringify({ success: false, error: 'Link usage limit exceeded' }),
        { 
          status: 410, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Increment use count
    const { error: updateError } = await supabaseClient
      .from('secure_links')
      .update({ use_count: secureLink.use_count + 1 })
      .eq('id', secureLink.id);

    if (updateError) {
      console.error('Error updating use count:', updateError);
      // Don't fail the request for this error, just log it
    }

    const response: ResolveSecureLinkResponse = {
      success: true,
      video: {
        id: secureLink.videos.id,
        title: secureLink.videos.title,
        storage_path: secureLink.videos.storage_path,
        duration_ms: secureLink.videos.duration_ms || 0,
        width: secureLink.videos.width || 0,
        height: secureLink.videos.height || 0,
        poster_path: secureLink.videos.poster_path || '',
      },
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in resolve_secure_link:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
