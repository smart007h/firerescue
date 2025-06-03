-- Create incident_messages table
CREATE TABLE IF NOT EXISTS incident_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE incident_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view incident messages"
    ON incident_messages FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert incident messages"
    ON incident_messages FOR INSERT
    WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_incident_messages_incident_id ON incident_messages(incident_id);
CREATE INDEX idx_incident_messages_created_at ON incident_messages(created_at); 