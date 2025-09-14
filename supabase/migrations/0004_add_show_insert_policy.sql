-- Add missing INSERT policy for shows table
CREATE POLICY "Authenticated users can create shows" ON public.shows
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
