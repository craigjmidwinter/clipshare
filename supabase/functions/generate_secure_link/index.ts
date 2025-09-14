import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateSecureLinkRequest {
  video_id: string;
  expires_at?: string;
  max_uses?: number;
}

interface GenerateSecureLinkResponse {
  success: boolean;
  link?: string;
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

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { video_id, expires_at, max_uses }: GenerateSecureLinkRequest = await req.json();

    if (!video_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'video_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify user has permission to create secure links for this video
    const { data: video, error: videoError } = await supabaseClient
      .from('videos')
      .select(`
        id,
        shows!inner(
          id,
          owner_id
        )
      `)
      .eq('id', video_id)
      .single();

    if (videoError || !video) {
      return new Response(
        JSON.stringify({ success: false, error: 'Video not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if user is the producer (owner) of the show
    if (video.shows.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Permission denied' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate a secure token (128-bit random hex)
    const token = crypto.getRandomValues(new Uint8Array(16))
      .reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

    // Parse expiry date if provided
    let expiresAt: string | null = null;
    if (expires_at) {
      const expiryDate = new Date(expires_at);
      if (isNaN(expiryDate.getTime())) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid expiry date format' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      expiresAt = expiryDate.toISOString();
    }

    // Insert the secure link record
    const { data: secureLink, error: insertError } = await supabaseClient
      .from('secure_links')
      .insert({
        video_id,
        token,
        expires_at: expiresAt,
        max_uses: max_uses || null,
        use_count: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating secure link:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create secure link' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate the secure link URL
    const baseUrl = Deno.env.get('SITE_URL') || 'http://localhost:3000';
    const secureLinkUrl = `${baseUrl}/secure/${token}`;

    const response: GenerateSecureLinkResponse = {
      success: true,
      link: secureLinkUrl,
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate_secure_link:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
