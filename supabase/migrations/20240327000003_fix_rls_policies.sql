-- Drop existing policies
DROP POLICY IF EXISTS "Firefighters can view station bookings" ON training_bookings;
DROP POLICY IF EXISTS "Firefighters can update station booking status" ON training_bookings;

-- Create new policies using station_id
CREATE POLICY "Firefighters can view station bookings"
    ON training_bookings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM firefighters
            WHERE firefighters.station_id::TEXT = training_bookings.station_id::TEXT
            AND firefighters.id::UUID = auth.uid()::UUID
        )
    );

CREATE POLICY "Firefighters can update station booking status"
    ON training_bookings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM firefighters
            WHERE firefighters.station_id::TEXT = training_bookings.station_id::TEXT
            AND firefighters.id::UUID = auth.uid()::UUID
        )
    );

-- Add documentation
COMMENT ON POLICY "Firefighters can view station bookings" ON training_bookings IS 'Allows firefighters to view bookings for their station using station_id (TEXT)';
COMMENT ON POLICY "Firefighters can update station booking status" ON training_bookings IS 'Allows firefighters to update booking status for their station using station_id (TEXT)'; 