-- Add database-level protection for resolved incidents
-- This migration ensures that once an incident is resolved, it cannot be modified

-- Add resolved_at column if it doesn't already exist
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

-- Create a function to prevent updates to resolved incidents
CREATE OR REPLACE FUNCTION prevent_resolved_incident_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- If the OLD status is 'resolved', prevent any updates
    IF OLD.status = 'resolved' THEN
        RAISE EXCEPTION 'Cannot modify a resolved incident. Resolution is irreversible for data integrity.';
    END IF;
    
    -- If we're updating to resolved status, set the resolved_at timestamp
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
        NEW.resolved_at = TIMEZONE('utc'::text, NOW());
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce resolved incident protection
DROP TRIGGER IF EXISTS protect_resolved_incidents ON incidents;
CREATE TRIGGER protect_resolved_incidents
    BEFORE UPDATE ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION prevent_resolved_incident_updates();

-- Create index on resolved_at for performance
CREATE INDEX IF NOT EXISTS idx_incidents_resolved_at ON incidents(resolved_at);

-- Create index on status for better filtering performance
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);

-- Add comment for documentation
COMMENT ON COLUMN incidents.resolved_at IS 'Timestamp when the incident was resolved. Once set, the incident becomes immutable.';
COMMENT ON FUNCTION prevent_resolved_incident_updates() IS 'Prevents any modifications to resolved incidents to maintain data integrity';

-- Update RLS policies to ensure resolved incidents cannot be updated
DROP POLICY IF EXISTS "Users and dispatchers can update incidents" ON incidents;
CREATE POLICY "Users and dispatchers can update non-resolved incidents"
    ON incidents FOR UPDATE
    USING (
        -- Prevent updates to resolved incidents at the policy level as well
        status != 'resolved'
        AND (
            -- Allow if user is the reporter
            auth.uid() = reported_by 
            OR 
            -- Allow if user is assigned dispatcher
            EXISTS (
                SELECT 1 FROM dispatchers d 
                WHERE d.id = dispatcher_id 
                AND d.user_id = auth.uid()
            )
        )
    );
