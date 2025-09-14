import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface CreateUploadUrlRequest {
  showId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface CreateUploadUrlResponse {
  uploadUrl: string;
  videoId: string;
  objectKey: string;
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

    const body: CreateUploadUrlRequest = await req.json();
    const { showId, fileName, fileSize, mimeType } = body;

    // Validate input
    if (!showId || !fileName || !fileSize || !mimeType) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: showId, fileName, fileSize, mimeType' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate file type
    const allowedMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (!allowedMimeTypes.includes(mimeType)) {
      return new Response(JSON.stringify({ 
        error: 'Unsupported file type. Allowed types: mp4, mov, avi, webm' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate file size (50GB limit - leverages S3/MinIO with resumable uploads)
    const maxFileSize = 50 * 1024 * 1024 * 1024; // 50GB
    if (fileSize > maxFileSize) {
      return new Response(JSON.stringify({ 
        error: 'File size exceeds 50GB limit' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify user is a member of the show
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('role')
      .eq('show_id', showId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return new Response(JSON.stringify({ 
        error: 'You are not a member of this show' 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create video record
    const videoId = crypto.randomUUID();
    const objectKey = `${videoId}/${fileName}`;

    const { error: videoError } = await supabase
      .from('videos')
      .insert({
        id: videoId,
        show_id: showId,
        title: fileName.replace(/\.[^/.]+$/, ''), // Remove file extension
        storage_path: objectKey,
        status: 'uploading',
        created_by: user.id,
      });

    if (videoError) {
      console.error('Error creating video record:', videoError);
      return new Response(JSON.stringify({ 
        error: 'Failed to create video record' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate signed upload URL
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('videos')
      .createSignedUploadUrl(objectKey, {
        upsert: false, // Don't allow overwriting
      });

    if (urlError) {
      console.error('Error creating signed URL:', urlError);
      
      // Clean up the video record
      await supabase.from('videos').delete().eq('id', videoId);
      
      return new Response(JSON.stringify({ 
        error: 'Failed to create upload URL' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response: CreateUploadUrlResponse = {
      uploadUrl: signedUrl.signedUrl,
      videoId,
      objectKey,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Error in create_upload_url:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
