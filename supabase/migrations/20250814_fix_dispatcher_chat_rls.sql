-- Safe debugging migration: Check dispatcher table structure and fix chat RLS

-- First, let's see what columns actually exist in the dispatchers table
DO $$
DECLARE
    col_record RECORD;
BEGIN
    RAISE NOTICE 'Dispatcher table columns:';
    FOR col_record IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'dispatchers' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Column: % (Type: %)', col_record.column_name, col_record.data_type;
    END LOOP;
END $$;

-- Check incidents table dispatcher_id column type
DO $$
DECLARE
    col_type TEXT;
BEGIN
    SELECT data_type INTO col_type
    FROM information_schema.columns 
    WHERE table_name = 'incidents' 
    AND column_name = 'dispatcher_id'
    AND table_schema = 'public';
    
    RAISE NOTICE 'incidents.dispatcher_id type: %', COALESCE(col_type, 'NOT FOUND');
END $$;

-- Drop existing chat message policies
DROP POLICY IF EXISTS "Users can view messages for their incidents" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages for their incidents" ON chat_messages;
DROP POLICY IF EXISTS "Incident participants can view chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Incident participants can insert chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Chat participants can view messages" ON chat_messages;
DROP POLICY IF EXISTS "Chat participants can insert messages" ON chat_messages;
DROP POLICY IF EXISTS "Chat participants can update messages" ON chat_messages;
DROP POLICY IF EXISTS "Basic chat access for incident participants" ON chat_messages;
DROP POLICY IF EXISTS "Basic chat insert for incident participants" ON chat_messages;
DROP POLICY IF EXISTS "Basic chat update for incident participants" ON chat_messages;

-- Create safe function to compare dispatcher_id with auth.uid()
CREATE OR REPLACE FUNCTION is_dispatcher_for_incident(incident_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    dispatcher_id_value TEXT;
    user_id_str TEXT;
BEGIN
    -- Get the dispatcher_id from incidents table as text
    SELECT i.dispatcher_id::text INTO dispatcher_id_value
    FROM incidents i 
    WHERE i.id = incident_uuid;
    
    -- Convert user UUID to text
    user_id_str := user_uuid::text;
    
    -- Return true if they match
    RETURN dispatcher_id_value = user_id_str;
EXCEPTION
    WHEN OTHERS THEN
        -- If any error occurs, return false
        RETURN FALSE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_dispatcher_for_incident TO authenticated;

-- Create simple policies using the safe function
CREATE POLICY "Safe chat access for incident participants"
    ON chat_messages FOR SELECT
    USING (
        -- Users can view messages for incidents they reported
        EXISTS (
            SELECT 1 FROM incidents i 
            WHERE i.id = incident_id 
            AND i.reported_by = auth.uid()
        )
        OR
        -- Users can view their own messages
        sender_id = auth.uid()
        OR
        -- Dispatcher check using safe function
        is_dispatcher_for_incident(incident_id, auth.uid())
    );

CREATE POLICY "Safe chat insert for incident participants"
    ON chat_messages FOR INSERT
    WITH CHECK (
        -- Users can send messages for incidents they reported
        EXISTS (
            SELECT 1 FROM incidents i 
            WHERE i.id = incident_id 
            AND i.reported_by = auth.uid()
        )
        OR
        -- Dispatcher check using safe function
        is_dispatcher_for_incident(incident_id, auth.uid())
    );

CREATE POLICY "Safe chat update for incident participants"
    ON chat_messages FOR UPDATE
    USING (
        -- Users can update messages for incidents they reported
        EXISTS (
            SELECT 1 FROM incidents i 
            WHERE i.id = incident_id 
            AND i.reported_by = auth.uid()
        )
        OR
        -- Users can update their own messages
        sender_id = auth.uid()
        OR
        -- Dispatcher check using safe function
        is_dispatcher_for_incident(incident_id, auth.uid())
    );

-- Add comments
COMMENT ON POLICY "Safe chat access for incident participants" ON chat_messages IS 
'Safe policy for viewing chat messages - handles type conversions gracefully';

COMMENT ON POLICY "Safe chat insert for incident participants" ON chat_messages IS 
'Safe policy for sending chat messages - handles type conversions gracefully';

COMMENT ON POLICY "Safe chat update for incident participants" ON chat_messages IS 
'Safe policy for updating chat messages - handles type conversions gracefully';

COMMENT ON FUNCTION is_dispatcher_for_incident IS 
'Safe function to check if user is dispatcher for incident - handles type conversions';
