-- Quick fix to set up incident media storage
-- Run this SQL in your Supabase Dashboard -> SQL Editor

-- 1. Create storage bucket for incident media
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

-- 2. Create storage policies
CREATE POLICY "Incident media is publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'incident-media');

CREATE POLICY "Users can upload incident media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'incident-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. Create incident_media table
CREATE TABLE IF NOT EXISTS incident_media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
    file_size INTEGER,
    mime_type TEXT NOT NULL,
    public_url TEXT NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_incident_media_incident_id ON incident_media(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_media_uploaded_by ON incident_media(uploaded_by);

-- 5. Disable RLS temporarily for testing (like emergency_calls)
ALTER TABLE incident_media DISABLE ROW LEVEL SECURITY;

-- 6. Grant permissions
GRANT ALL ON incident_media TO authenticated;
GRANT ALL ON incident_media TO service_role;
GRANT ALL ON storage.objects TO authenticated;

-- 7. Verify setup
SELECT 'Storage bucket created' as status, id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'incident-media';

SELECT 'Table created' as status, COUNT(*) as row_count 
FROM incident_media;
