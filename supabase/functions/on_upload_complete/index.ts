import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface UploadCompleteRequest {
  videoId: string;
  objectKey: string;
  fileSize: number;
}

serve(async (req: Request): Promise<Response> => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
      });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body: UploadCompleteRequest = await req.json();
    const { videoId, objectKey, fileSize } = body;

    // Validate input
    if (!videoId || !objectKey || !fileSize) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: videoId, objectKey, fileSize' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify the video exists and user has access
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select(`
        id,
        show_id,
        created_by,
        status,
        memberships!inner(user_id)
      `)
      .eq('id', videoId)
      .eq('memberships.user_id', user.id)
      .single();

    if (videoError || !video) {
      return new Response(JSON.stringify({ 
        error: 'Video not found or access denied' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update video status to processing
    const { error: updateError } = await supabase
      .from('videos')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', videoId);

    if (updateError) {
      console.error('Error updating video status:', updateError);
      return new Response(JSON.stringify({ 
        error: 'Failed to update video status' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create thumbnail generation job
    const { error: jobError } = await supabase
      .from('processing_jobs')
      .insert({
        type: 'THUMBNAIL',
        status: 'queued',
        payload_json: {
          video_id: videoId,
          storage_path: objectKey,
          file_size: fileSize,
        },
      });

    if (jobError) {
      console.error('Error creating thumbnail job:', jobError);
      
      // Rollback video status
      await supabase
        .from('videos')
        .update({ status: 'error' })
        .eq('id', videoId);
      
      return new Response(JSON.stringify({ 
        error: 'Failed to create processing job' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Upload completed, processing started',
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Error in on_upload_complete:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
