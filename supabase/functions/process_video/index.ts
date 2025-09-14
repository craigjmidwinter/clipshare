import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ProcessVideoRequest {
  jobId: string;
}

serve(async (req: Request): Promise<Response> => {
  try {
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
    
    const body: ProcessVideoRequest = await req.json();
    const { jobId } = body;

    if (!jobId) {
      return new Response(JSON.stringify({ 
        error: 'Missing jobId' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the processing job
    const { data: job, error: jobError } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ 
        error: 'Job not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (job.status !== 'queued') {
      return new Response(JSON.stringify({ 
        error: 'Job is not in queued status' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update job status to running
    await supabase
      .from('processing_jobs')
      .update({ status: 'running' })
      .eq('id', jobId);

    const { video_id, storage_path, file_size } = job.payload_json;

    try {
      if (job.type === 'THUMBNAIL') {
        // Generate thumbnail (placeholder implementation)
        // In a real implementation, you would use FFmpeg or similar
        const thumbnailPath = `thumbnails/${video_id}/poster.jpg`;
        
        // For now, we'll just update the video record with placeholder data
        // In production, you'd generate an actual thumbnail
        const { error: updateError } = await supabase
          .from('videos')
          .update({
            status: 'ready',
            poster_path: thumbnailPath,
            // In production, you'd extract these from the actual video
            duration_ms: 0,
            width: 1920,
            height: 1080,
            updated_at: new Date().toISOString(),
          })
          .eq('id', video_id);

        if (updateError) {
          throw new Error(`Failed to update video: ${updateError.message}`);
        }

        // Update job status to succeeded
        await supabase
          .from('processing_jobs')
          .update({ 
            status: 'succeeded',
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);

      } else {
        throw new Error(`Unsupported job type: ${job.type}`);
      }

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Video processing completed',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (processingError) {
      console.error('Error processing video:', processingError);
      
      // Update job status to failed
      await supabase
        .from('processing_jobs')
        .update({ 
          status: 'failed',
          error_text: processingError.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      // Update video status to error
      await supabase
        .from('videos')
        .update({ 
          status: 'error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', video_id);

      return new Response(JSON.stringify({ 
        error: 'Video processing failed',
        details: processingError.message,
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in process_video:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
