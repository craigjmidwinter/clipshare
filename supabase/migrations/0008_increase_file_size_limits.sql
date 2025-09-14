-- Update storage bucket file size limits for larger video files
-- Increase videos bucket limit from 1GB to 50GB to support larger video files
-- This leverages S3/MinIO backend with resumable uploads

UPDATE storage.buckets 
SET file_size_limit = 53687091200  -- 50GB in bytes
WHERE id = 'videos';

-- Also update exports bucket to handle larger exports
UPDATE storage.buckets 
SET file_size_limit = 107374182400  -- 100GB in bytes  
WHERE id = 'exports';
