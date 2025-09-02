-- Fix RLS policies for multiple tables
-- Run this SQL in your Supabase Dashboard -> SQL Editor

-- =========================
-- EMERGENCY CALLS TABLE FIX
-- =========================
ALTER TABLE emergency_calls DISABLE ROW LEVEL SECURITY;

-- =========================
-- SERVICE FEEDBACK TABLE FIX
-- =========================
ALTER TABLE service_feedback DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled,
    forcerowsecurity as force_rls
FROM pg_tables 
WHERE tablename = 'service_feedback';

-- Test that service feedback can now be created
SELECT 
    has_table_privilege('service_feedback', 'SELECT') as can_select,
    has_table_privilege('service_feedback', 'INSERT') as can_insert,
    has_table_privilege('service_feedback', 'UPDATE') as can_update;

-- OPTION 2: Fix RLS policies (Uncomment this section if you prefer to keep RLS enabled)
/*
-- Re-enable RLS for production
ALTER TABLE service_feedback ENABLE ROW LEVEL SECURITY;

-- Drop any existing problematic policies
DROP POLICY IF EXISTS "Users can insert their own feedback" ON service_feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON service_feedback;
DROP POLICY IF EXISTS "Users can update their own feedback" ON service_feedback;
DROP POLICY IF EXISTS "Service role can view all feedback" ON service_feedback;
DROP POLICY IF EXISTS "service_feedback_insert_policy" ON service_feedback;
DROP POLICY IF EXISTS "service_feedback_select_policy" ON service_feedback;
DROP POLICY IF EXISTS "service_feedback_update_policy" ON service_feedback;

-- Create working policies
CREATE POLICY "Allow service feedback insertion" ON service_feedback
    FOR INSERT 
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow service feedback viewing" ON service_feedback
    FOR SELECT 
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Allow service feedback updates" ON service_feedback
    FOR UPDATE 
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Allow service role to manage all feedback
CREATE POLICY "Service role can manage all feedback" ON service_feedback
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);
*/

-- Ensure proper permissions are granted
GRANT ALL ON service_feedback TO authenticated;
GRANT ALL ON service_feedback TO service_role;
