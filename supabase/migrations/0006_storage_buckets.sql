-- Storage bucket setup for video uploads and processing

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('videos', 'videos', false, 1073741824, ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']),
  ('thumbnails', 'thumbnails', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('clips-public', 'clips-public', true, 536870912, ARRAY['video/mp4', 'video/webm']),
  ('exports', 'exports', false, 2147483648, ARRAY['application/zip', 'video/mp4', 'video/webm'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for videos bucket
CREATE POLICY "Show members can upload videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'videos' AND
    EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.memberships m ON m.show_id = v.show_id
      WHERE v.id = (storage.foldername(name))[1]::uuid AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Show members can view videos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'videos' AND
    EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.memberships m ON m.show_id = v.show_id
      WHERE v.id = (storage.foldername(name))[1]::uuid AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Video creators can update videos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'videos' AND
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = (storage.foldername(name))[1]::uuid AND v.created_by = auth.uid()
    )
  );

-- Storage policies for thumbnails bucket
CREATE POLICY "Show members can upload thumbnails" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'thumbnails' AND
    EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.memberships m ON m.show_id = v.show_id
      WHERE v.id = (storage.foldername(name))[1]::uuid AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Show members can view thumbnails" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'thumbnails' AND
    EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.memberships m ON m.show_id = v.show_id
      WHERE v.id = (storage.foldername(name))[1]::uuid AND m.user_id = auth.uid()
    )
  );

-- Storage policies for clips-public bucket (public access)
CREATE POLICY "Anyone can view public clips" ON storage.objects
  FOR SELECT USING (bucket_id = 'clips-public');

CREATE POLICY "Show producers can upload public clips" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'clips-public' AND
    EXISTS (
      SELECT 1 FROM public.bookmarks b
      JOIN public.videos v ON v.id = b.video_id
      JOIN public.shows s ON s.id = v.show_id
      WHERE b.public_slug = (storage.foldername(name))[1] AND s.owner_id = auth.uid()
    )
  );

-- Storage policies for exports bucket
CREATE POLICY "Show producers can upload exports" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'exports' AND
    EXISTS (
      SELECT 1 FROM public.processing_jobs pj
      JOIN public.videos v ON v.id = (pj.payload_json->>'video_id')::uuid
      JOIN public.shows s ON s.id = v.show_id
      WHERE pj.id = (storage.foldername(name))[1]::uuid AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Show producers can view exports" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'exports' AND
    EXISTS (
      SELECT 1 FROM public.processing_jobs pj
      JOIN public.videos v ON v.id = (pj.payload_json->>'video_id')::uuid
      JOIN public.shows s ON s.id = v.show_id
      WHERE pj.id = (storage.foldername(name))[1]::uuid AND s.owner_id = auth.uid()
    )
  );
