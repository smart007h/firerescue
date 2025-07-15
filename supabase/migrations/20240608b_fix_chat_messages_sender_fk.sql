-- Step 2: Alter sender_id, add FK, and recreate policies

-- Change sender_id to uuid
ALTER TABLE chat_messages
ALTER COLUMN sender_id TYPE uuid USING sender_id::uuid;

-- Drop the foreign key constraint if it exists, then add it
ALTER TABLE chat_messages
DROP CONSTRAINT IF EXISTS fk_chat_messages_sender;

ALTER TABLE chat_messages
ADD CONSTRAINT fk_chat_messages_sender
FOREIGN KEY (sender_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Recreate the policies

CREATE POLICY "Users can view their incident messages"
    ON chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM incidents
            WHERE incidents.id = chat_messages.incident_id
            AND (
                incidents.reported_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM incident_responses
                    WHERE incident_responses.incident_id = incidents.id
                    AND incident_responses.firefighter_id = auth.uid()
                )
                OR EXISTS (
                    SELECT 1 FROM firefighters
                    WHERE firefighters.station_id = incidents.station_id
                    AND firefighters.id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can send messages to their incidents"
    ON chat_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM incidents
            WHERE incidents.id = chat_messages.incident_id
            AND (
                incidents.reported_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM incident_responses
                    WHERE incident_responses.incident_id = incidents.id
                    AND incident_responses.firefighter_id = auth.uid()
                )
                OR EXISTS (
                    SELECT 1 FROM firefighters
                    WHERE firefighters.station_id = incidents.station_id
                    AND firefighters.id = auth.uid()
                )
            )
        )
        AND sender_id = auth.uid()
    );

CREATE POLICY "Users can update their own messages"
    ON chat_messages
    FOR UPDATE
    USING (sender_id = auth.uid())
    WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
    ON chat_messages
    FOR DELETE
    USING (sender_id = auth.uid()); 