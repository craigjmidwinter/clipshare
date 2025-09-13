-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secure_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Shows: Owners can manage, members can read
CREATE POLICY "Show owners can manage shows" ON public.shows
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Show members can view shows" ON public.shows
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.memberships 
      WHERE show_id = shows.id AND user_id = auth.uid()
    )
  );

-- Memberships: Producers can manage, members can view
CREATE POLICY "Producers can manage memberships" ON public.memberships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.shows 
      WHERE id = show_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own memberships" ON public.memberships
  FOR SELECT USING (user_id = auth.uid());

-- Videos: Members can read, producers can insert/update
CREATE POLICY "Show members can view videos" ON public.videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.memberships 
      WHERE show_id = videos.show_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Show members can insert videos" ON public.videos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships 
      WHERE show_id = videos.show_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Video creators can update own videos" ON public.videos
  FOR UPDATE USING (created_by = auth.uid());

-- Bookmarks: Members can read, creators can edit, producers can delete
CREATE POLICY "Show members can view bookmarks" ON public.bookmarks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.memberships m ON m.show_id = v.show_id
      WHERE v.id = bookmarks.video_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Bookmark creators can manage own bookmarks" ON public.bookmarks
  FOR ALL USING (created_by = auth.uid());

CREATE POLICY "Producers can delete any bookmark in their shows" ON public.bookmarks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.shows s ON s.id = v.show_id
      WHERE v.id = bookmarks.video_id AND s.owner_id = auth.uid()
    )
  );

-- Secure links: Producers can manage
CREATE POLICY "Producers can manage secure links" ON public.secure_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.shows s ON s.id = v.show_id
      WHERE v.id = secure_links.video_id AND s.owner_id = auth.uid()
    )
  );

-- Invites: Producers can manage
CREATE POLICY "Producers can manage invites" ON public.invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.shows 
      WHERE id = show_id AND owner_id = auth.uid()
    )
  );

-- Processing jobs: Service role can manage, users can read relevant jobs
CREATE POLICY "Service role can manage jobs" ON public.processing_jobs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view relevant jobs" ON public.processing_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.memberships m ON m.show_id = v.show_id
      WHERE v.id = (payload_json->>'video_id')::uuid AND m.user_id = auth.uid()
    )
  );

-- Function to resolve public clips by slug (no auth required)
CREATE OR REPLACE FUNCTION public.resolve_public_clip(slug_param text)
RETURNS TABLE (
  id uuid,
  video_id uuid,
  label text,
  notes text,
  start_ms integer,
  end_ms integer,
  created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.video_id,
    b.label,
    b.notes,
    b.start_ms,
    b.end_ms,
    b.created_at
  FROM public.bookmarks b
  WHERE b.public_slug = slug_param 
    AND b.is_public_revoked = false;
END;
$$;
