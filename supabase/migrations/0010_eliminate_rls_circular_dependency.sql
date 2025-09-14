-- Eliminate ALL circular dependencies in RLS policies
-- This migration completely removes circular references between tables

-- Drop all existing policies that could cause circular dependencies
DROP POLICY IF EXISTS "Show members can view shows" ON public.shows;
DROP POLICY IF EXISTS "Show owners can manage shows" ON public.shows;
DROP POLICY IF EXISTS "Authenticated users can create shows" ON public.shows;
DROP POLICY IF EXISTS "Show owners can manage memberships" ON public.memberships;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.memberships;
DROP POLICY IF EXISTS "Users can insert own memberships" ON public.memberships;
DROP POLICY IF EXISTS "Show members can view videos" ON public.videos;
DROP POLICY IF EXISTS "Show members can insert videos" ON public.videos;
DROP POLICY IF EXISTS "Video creators can update own videos" ON public.videos;
DROP POLICY IF EXISTS "Show members can view bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Bookmark creators can manage own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Producers can delete any bookmark in their shows" ON public.bookmarks;
DROP POLICY IF EXISTS "Producers can manage secure links" ON public.secure_links;
DROP POLICY IF EXISTS "Producers can manage invites" ON public.invites;

-- Create simplified policies that avoid circular dependencies
-- Shows: Only check owner_id directly, no references to other tables
CREATE POLICY "Show owners can manage shows" ON public.shows
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Authenticated users can create shows" ON public.shows
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Memberships: Only check user_id directly, no references to shows table
CREATE POLICY "Users can manage own memberships" ON public.memberships
  FOR ALL USING (user_id = auth.uid());

-- Videos: Check owner_id directly through shows table, no memberships reference
CREATE POLICY "Show owners can manage videos" ON public.videos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.shows 
      WHERE id = videos.show_id AND owner_id = auth.uid()
    )
  );

-- Bookmarks: Check owner_id directly through videos and shows, no memberships reference
CREATE POLICY "Bookmark creators can manage own bookmarks" ON public.bookmarks
  FOR ALL USING (created_by = auth.uid());

CREATE POLICY "Show owners can manage bookmarks in their shows" ON public.bookmarks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.shows s ON s.id = v.show_id
      WHERE v.id = bookmarks.video_id AND s.owner_id = auth.uid()
    )
  );

-- Secure links: Check owner_id directly through videos and shows
CREATE POLICY "Show owners can manage secure links" ON public.secure_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.shows s ON s.id = v.show_id
      WHERE v.id = secure_links.video_id AND s.owner_id = auth.uid()
    )
  );

-- Invites: Check owner_id directly through shows
CREATE POLICY "Show owners can manage invites" ON public.invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.shows 
      WHERE id = show_id AND owner_id = auth.uid()
    )
  );
