-- Drop existing policies to fix infinite recursion
DROP POLICY IF EXISTS "Show owners can manage shows" ON public.shows;
DROP POLICY IF EXISTS "Show members can view shows" ON public.shows;
DROP POLICY IF EXISTS "Producers can manage memberships" ON public.memberships;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.memberships;

-- Simplified shows policies (no circular dependency)
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

-- Simplified memberships policies (no circular dependency)
CREATE POLICY "Show owners can manage memberships" ON public.memberships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.shows 
      WHERE id = show_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own memberships" ON public.memberships
  FOR SELECT USING (user_id = auth.uid());

-- Allow users to insert their own memberships (for invite acceptance)
CREATE POLICY "Users can insert own memberships" ON public.memberships
  FOR INSERT WITH CHECK (user_id = auth.uid());
