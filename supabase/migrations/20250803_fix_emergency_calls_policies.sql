-- Fix emergency_calls RLS policies by dropping old conflicting policies and creating clean ones

-- Drop all existing emergency_calls policies
DROP POLICY IF EXISTS "Users can insert their own emergency calls" ON emergency_calls;
DROP POLICY IF EXISTS "Users can view their own emergency calls" ON emergency_calls;
DROP POLICY IF EXISTS "Firefighters can view emergency calls for their station" ON emergency_calls;
DROP POLICY IF EXISTS "Users can view their emergency calls" ON emergency_calls;
DROP POLICY IF EXISTS "Users can create emergency calls" ON emergency_calls;
DROP POLICY IF EXISTS "Firefighters can update emergency call status" ON emergency_calls;

-- Create clean, non-conflicting policies
CREATE POLICY "emergency_calls_insert_policy"
    ON emergency_calls FOR INSERT
    WITH CHECK (caller_id = auth.uid());

CREATE POLICY "emergency_calls_select_policy"
    ON emergency_calls FOR SELECT
    USING (
        caller_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM firefighters
            WHERE firefighters.id = emergency_calls.station_id
            AND firefighters.id = auth.uid()
        )
    );

CREATE POLICY "emergency_calls_update_policy"
    ON emergency_calls FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM firefighters
            WHERE firefighters.id = emergency_calls.station_id
            AND firefighters.id = auth.uid()
        )
    );
