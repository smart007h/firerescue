-- Create chat_messages table with proper foreign key constraints

-- Drop existing table if it exists (for clean recreation)
DROP TABLE IF EXISTS chat_messages CASCADE;

-- Create chat_messages table
CREATE TABLE chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_chat_messages_incident_id ON chat_messages(incident_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Create policies for chat access
CREATE POLICY "Users can view messages for their incidents"
    ON chat_messages FOR SELECT
    USING (
        -- Can view if user reported the incident
        EXISTS (
            SELECT 1 FROM incidents i 
            WHERE i.id = incident_id 
            AND i.reported_by = auth.uid()
        )
        OR
        -- Can view if user is assigned dispatcher
        EXISTS (
            SELECT 1 FROM incidents i 
            JOIN dispatchers d ON d.id = i.dispatcher_id
            WHERE i.id = incident_id 
            AND d.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages for their incidents"
    ON chat_messages FOR INSERT
    WITH CHECK (
        -- Can insert if user reported the incident
        EXISTS (
            SELECT 1 FROM incidents i 
            WHERE i.id = incident_id 
            AND i.reported_by = auth.uid()
        )
        OR
        -- Can insert if user is assigned dispatcher
        EXISTS (
            SELECT 1 FROM incidents i 
            JOIN dispatchers d ON d.id = i.dispatcher_id
            WHERE i.id = incident_id 
            AND d.user_id = auth.uid()
        )
    );

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON chat_messages TO authenticated;
GRANT ALL ON chat_messages TO service_role;

-- Add comments for documentation
COMMENT ON TABLE chat_messages IS 'Real-time chat messages between incident reporters and dispatchers';
COMMENT ON COLUMN chat_messages.incident_id IS 'Reference to the incident this message belongs to';
COMMENT ON COLUMN chat_messages.sender_id IS 'User ID of the message sender';
COMMENT ON COLUMN chat_messages.message IS 'The actual message content';
