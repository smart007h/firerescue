-- Create storage bucket for incident media (images and videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('incident-media', 'incident-media', true, 52428800, ARRAY[
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm'
  ])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create storage policies for incident media bucket
CREATE POLICY "Incident media is publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'incident-media');

CREATE POLICY "Users can upload incident media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'incident-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own incident media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'incident-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own incident media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'incident-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Verify the bucket was created
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'incident-media';

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
