-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Firefighters can create incident responses" ON incident_responses;

-- Create policy to allow firefighters to create incident responses
CREATE POLICY "Firefighters can create incident responses"
    ON incident_responses FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM firefighters
            WHERE firefighters.id = incident_responses.firefighter_id
            AND firefighters.station_id = (
                SELECT station_id FROM incidents
                WHERE incidents.id = incident_responses.incident_id
            )
        )
    );

-- Grant necessary permissions
GRANT ALL ON incident_responses TO authenticated; 