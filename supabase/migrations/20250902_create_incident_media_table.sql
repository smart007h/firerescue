-- Create incident_media table to track individual media files
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incident_media_incident_id ON incident_media(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_media_uploaded_by ON incident_media(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_incident_media_file_type ON incident_media(file_type);
CREATE INDEX IF NOT EXISTS idx_incident_media_created_at ON incident_media(created_at DESC);

-- Enable Row Level Security
ALTER TABLE incident_media ENABLE ROW LEVEL SECURITY;

-- Create policies for incident_media
CREATE POLICY "Users can view incident media for their incidents"
    ON incident_media FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM incidents
            WHERE incidents.id = incident_media.incident_id
            AND incidents.reported_by = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM firefighters
            WHERE firefighters.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can upload media for their incidents"
    ON incident_media FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM incidents
            WHERE incidents.id = incident_media.incident_id
            AND incidents.reported_by = auth.uid()
        )
        AND uploaded_by = auth.uid()
    );

CREATE POLICY "Users can update their own incident media"
    ON incident_media FOR UPDATE
    USING (uploaded_by = auth.uid());

CREATE POLICY "Users can delete their own incident media"
    ON incident_media FOR DELETE
    USING (uploaded_by = auth.uid());

-- Grant necessary permissions
GRANT ALL ON incident_media TO authenticated;
GRANT ALL ON incident_media TO service_role;

-- Add comments for documentation
COMMENT ON TABLE incident_media IS 'Individual media files (images/videos) uploaded for incidents';
COMMENT ON COLUMN incident_media.file_path IS 'Storage path in the incident-media bucket';
COMMENT ON COLUMN incident_media.public_url IS 'Public URL for accessing the media file';
COMMENT ON COLUMN incident_media.file_type IS 'Type of media: image or video';
COMMENT ON COLUMN incident_media.mime_type IS 'MIME type of the uploaded file';
