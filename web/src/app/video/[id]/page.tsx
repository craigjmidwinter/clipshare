import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Player } from '@/components/Player';
import { Timecode } from '@/components/Timecode';

type Props = { params: { id: string } };

export default async function VideoPage({ params }: Props) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const envReady = Boolean(supabaseUrl && supabaseAnon);
  if (!envReady) redirect('/login');

  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Placeholder src; will be replaced by signed URL from Supabase Storage
  const mockHls = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-4">
        <Player src={mockHls} />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Set In/Out and save a bookmark.</span>
        </div>
        <BookmarkControls />
      </div>
      <div className="lg:col-span-2">
        <BookmarkList />
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


