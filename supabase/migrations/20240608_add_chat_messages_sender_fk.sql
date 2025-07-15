-- Migration: Fix chat_messages.sender_id type and foreign key constraint

-- 1. Drop policies that reference sender_id
DROP POLICY IF EXISTS "Users can view their incident messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their incidents" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON chat_messages;

-- 2. Alter the column type
ALTER TABLE chat_messages
ALTER COLUMN sender_id TYPE uuid USING sender_id::uuid;

-- 3. Drop the foreign key constraint if it exists, then add it
ALTER TABLE chat_messages
DROP CONSTRAINT IF EXISTS fk_chat_messages_sender;

ALTER TABLE chat_messages
ADD CONSTRAINT fk_chat_messages_sender
FOREIGN KEY (sender_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 4. Recreate the policies

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