-- Add foreign key relationship between chat_messages and profiles
ALTER TABLE chat_messages
ADD CONSTRAINT fk_chat_messages_sender
FOREIGN KEY (sender_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for chat_messages
-- Users can view messages for incidents they're involved in
CREATE POLICY "Users can view their incident messages"
    ON chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM incidents
            WHERE incidents.id = chat_messages.incident_id
            AND (
                -- User is the reporter
                incidents.reported_by = auth.uid()
                OR
                -- User is a firefighter assigned to the incident
                EXISTS (
                    SELECT 1 FROM incident_responses
                    WHERE incident_responses.incident_id = incidents.id
                    AND incident_responses.firefighter_id = auth.uid()
                )
                OR
                -- User is a firefighter from the station handling the incident
                EXISTS (
                    SELECT 1 FROM firefighters
                    WHERE firefighters.station_id = incidents.station_id
                    AND firefighters.id = auth.uid()
                )
            )
        )
    );

-- Users can insert messages for incidents they're involved in
CREATE POLICY "Users can send messages to their incidents"
    ON chat_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM incidents
            WHERE incidents.id = chat_messages.incident_id
            AND (
                -- User is the reporter
                incidents.reported_by = auth.uid()
                OR
                -- User is a firefighter assigned to the incident
                EXISTS (
                    SELECT 1 FROM incident_responses
                    WHERE incident_responses.incident_id = incidents.id
                    AND incident_responses.firefighter_id = auth.uid()
                )
                OR
                -- User is a firefighter from the station handling the incident
                EXISTS (
                    SELECT 1 FROM firefighters
                    WHERE firefighters.station_id = incidents.station_id
                    AND firefighters.id = auth.uid()
                )
            )
        )
        AND sender_id = auth.uid()  -- Ensure sender_id matches the authenticated user
    );

-- Users can update their own messages
CREATE POLICY "Users can update their own messages"
    ON chat_messages
    FOR UPDATE
    USING (sender_id = auth.uid())
    WITH CHECK (sender_id = auth.uid());

-- Users can delete their own messages
CREATE POLICY "Users can delete their own messages"
    ON chat_messages
    FOR DELETE
    USING (sender_id = auth.uid());

-- Add comment to table
COMMENT ON TABLE chat_messages IS 'Stores chat messages for incidents between users and firefighters'; 