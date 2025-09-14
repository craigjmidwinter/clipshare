import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Player } from '@/components/Player';
import { Timecode } from '@/components/Timecode';
import { VideoControls } from '@/components/VideoControls';

type Props = { params: { id: string } };

export default async function VideoPage({ params }: Props) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const envReady = Boolean(supabaseUrl && supabaseAnon);
  if (!envReady) redirect('/login');

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch video data and check permissions
  const { data: video, error: videoError } = await supabase
    .from('videos')
    .select(`
      id,
      title,
      storage_path,
      duration_ms,
      width,
      height,
      poster_path,
      shows!inner(
        id,
        owner_id,
        name
      )
    `)
    .eq('id', params.id)
    .single();

  if (videoError || !video) {
    redirect('/app');
  }

  // Check if user is a producer (owner) of the show
  const isProducer = video.shows.owner_id === user.id;

  // Get signed URL for the video from Supabase Storage
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('videos')
    .createSignedUrl(video.storage_path, 3600); // 1 hour expiry

  if (signedUrlError || !signedUrlData) {
    return (
      <div className="p-6">
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
    <div className="p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{video.title}</h1>
          <p className="text-sm text-muted-foreground">
            {video.shows.name} • {Math.floor((video.duration_ms || 0) / 1000)}s duration
          </p>
        </div>
        <Player src={signedUrlData.signedUrl} poster={posterUrl} />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Set In/Out and save a bookmark.</span>
        </div>
        <BookmarkControls />
      </div>
      <div className="lg:col-span-2 space-y-4">
        <BookmarkList />
        <VideoControls videoId={video.id} isProducer={isProducer} />
      </div>
    </div>
  );
}

function BookmarkControls() {
  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="flex gap-2">
        <button className="rounded-md border px-3 py-2">Set In</button>
        <button className="rounded-md border px-3 py-2">Set Out</button>
        <button className="rounded-md bg-black text-white px-3 py-2">Save Bookmark</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="text-sm">
          In: <Timecode ms={0} />
        </div>
        <div className="text-sm">
          Out: <Timecode ms={0} />
        </div>
      </div>
      <div className="grid gap-2">
        <input className="rounded-md border px-3 py-2" placeholder="Label" />
        <textarea className="rounded-md border px-3 py-2" placeholder="Notes" rows={3} />
      </div>
    </div>
  );
}

function BookmarkList() {
  return (
    <div className="rounded-md border p-4 space-y-3">
      <h2 className="font-medium">Bookmarks</h2>
      <div className="text-sm text-muted-foreground">No bookmarks yet.</div>
    </div>
  );
}


