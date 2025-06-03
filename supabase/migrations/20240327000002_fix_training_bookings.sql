-- Drop existing foreign key constraint if it exists
ALTER TABLE training_bookings 
    DROP CONSTRAINT IF EXISTS training_bookings_station_id_fkey;

-- Change station_id column type to TEXT if it's not already TEXT
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'training_bookings' 
        AND column_name = 'station_id' 
        AND data_type != 'text'
    ) THEN
        ALTER TABLE training_bookings 
            ALTER COLUMN station_id TYPE TEXT USING station_id::TEXT;
    END IF;
END $$;

-- Add foreign key constraint referencing firefighters.station_id
ALTER TABLE training_bookings
    ADD CONSTRAINT training_bookings_station_id_fkey 
    FOREIGN KEY (station_id) 
    REFERENCES firefighters(station_id);

-- Add documentation
COMMENT ON COLUMN training_bookings.station_id IS 'References firefighters.station_id (e.g., "FS002")'; 