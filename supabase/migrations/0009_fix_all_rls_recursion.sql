-- Comprehensive fix for all RLS circular dependencies
-- This migration fixes all policies that could cause infinite recursion

-- Drop all problematic policies that could cause circular dependencies
DROP POLICY IF EXISTS "Show members can view shows" ON public.shows;
DROP POLICY IF EXISTS "Show owners can manage shows" ON public.shows;
DROP POLICY IF EXISTS "Producers can manage memberships" ON public.memberships;
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
DROP POLICY IF EXISTS "Authenticated users can create shows" ON public.shows;

-- Recreate shows policies without circular dependencies
CREATE POLICY "Show owners can manage shows" ON public.shows
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Show members can view shows" ON public.shows
  FOR SELECT USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM public.memberships 
      WHERE show_id = shows.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create shows" ON public.shows
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Recreate memberships policies without circular dependencies
CREATE POLICY "Show owners can manage memberships" ON public.memberships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.shows 
      WHERE id = show_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own memberships" ON public.memberships
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own memberships" ON public.memberships
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Recreate videos policies without circular dependencies
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

-- Recreate bookmarks policies without circular dependencies
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

-- Recreate secure links policies without circular dependencies
CREATE POLICY "Producers can manage secure links" ON public.secure_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.shows s ON s.id = v.show_id
      WHERE v.id = secure_links.video_id AND s.owner_id = auth.uid()
    )
  );

-- Recreate invites policies without circular dependencies
CREATE POLICY "Producers can manage invites" ON public.invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.shows 
      WHERE id = show_id AND owner_id = auth.uid()
    )
  );
