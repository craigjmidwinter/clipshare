import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Player } from '@/components/Player';

type Props = { params: { token: string } };

export default async function SecureVideoPage({ params }: Props) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    redirect('/login');
  }

  try {
    // Call the resolve_secure_link edge function
    const response = await fetch(`${supabaseUrl}/functions/v1/resolve_secure_link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ token: params.token }),
    });

    const result = await response.json();

    if (!result.success) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Link Not Available</h1>
            <p className="text-muted-foreground">
              {result.error || 'This secure link is no longer valid.'}
            </p>
            <p className="text-sm text-muted-foreground">
              The link may have expired, been revoked, or exceeded its usage limit.
            </p>
          </div>
        </div>
      );
    }

    const { video } = result;

    // Get signed URL for the video from Supabase Storage
    const supabase = await getSupabaseServerClient();
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('videos')
      .createSignedUrl(video.storage_path, 3600); // 1 hour expiry

    if (signedUrlError || !signedUrlData) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Video Not Available</h1>
            <p className="text-muted-foreground">
              Unable to load the video file.
            </p>
          </div>
        </div>
      );
    }

    // Get signed URL for poster image if available
    let posterUrl: string | undefined;
    if (video.poster_path) {
      const { data: posterData } = await supabase.storage
        .from('thumbnails')
        .createSignedUrl(video.poster_path, 3600);
      posterUrl = posterData?.signedUrl;
    }

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-foreground">{video.title}</h1>
              <p className="text-muted-foreground">
                Secure video link • {Math.floor(video.duration_ms / 1000)}s duration
              </p>
            </div>

            {/* Video Player */}
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <Player 
                src={signedUrlData.signedUrl}
                poster={posterUrl}
              />
            </div>

            {/* Video Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="font-semibold text-foreground">Resolution</div>
                <div className="text-muted-foreground">
                  {video.width} × {video.height}
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="font-semibold text-foreground">Duration</div>
                <div className="text-muted-foreground">
                  {Math.floor(video.duration_ms / 1000)} seconds
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="font-semibold text-foreground">Access</div>
                <div className="text-muted-foreground">Secure Link</div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground">
              <p>This video is shared via a secure link from Clipshare</p>
            </div>
          </div>
        </div>
      </div>
    );

  } catch (error) {
    console.error('Error loading secure video:', error);
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Error</h1>
          <p className="text-muted-foreground">
            An error occurred while loading the video.
          </p>
        </div>
      </div>
    );
  }
}
