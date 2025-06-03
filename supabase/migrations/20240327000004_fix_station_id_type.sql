-- Drop existing policies that depend on station_id
DROP POLICY IF EXISTS "Firefighters can view station bookings" ON training_bookings;
DROP POLICY IF EXISTS "Firefighters can update station booking status" ON training_bookings;

-- Drop any existing foreign key constraints
ALTER TABLE training_bookings 
    DROP CONSTRAINT IF EXISTS training_bookings_station_id_fkey;

-- Force station_id to be TEXT type
ALTER TABLE training_bookings 
    ALTER COLUMN station_id TYPE TEXT USING station_id::TEXT;

-- Re-add the foreign key constraint
ALTER TABLE training_bookings
    ADD CONSTRAINT training_bookings_station_id_fkey 
    FOREIGN KEY (station_id) 
    REFERENCES firefighters(station_id);

-- Recreate the policies with explicit TEXT casting
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
COMMENT ON COLUMN training_bookings.station_id IS 'References firefighters.station_id (e.g., "FS002")';
COMMENT ON POLICY "Firefighters can view station bookings" ON training_bookings IS 'Allows firefighters to view bookings for their station using station_id (TEXT)';
COMMENT ON POLICY "Firefighters can update station booking status" ON training_bookings IS 'Allows firefighters to update booking status for their station using station_id (TEXT)';

-- Verify the column type
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'training_bookings' 
        AND column_name = 'station_id' 
        AND data_type != 'text'
    ) THEN
        RAISE EXCEPTION 'station_id is not TEXT type after migration';
    END IF;
END $$; 