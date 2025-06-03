-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can create incident responses for their incidents" ON incident_responses;

-- Create policy to allow users to create incident responses for their incidents
CREATE POLICY "Users can create incident responses for their incidents"
    ON incident_responses FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM incidents
            WHERE incidents.id = incident_responses.incident_id
            AND incidents.reported_by = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT ALL ON incident_responses TO authenticated; 