-- Drop all dependent objects first
DROP POLICY IF EXISTS "Firefighters can view station bookings" ON training_bookings;
DROP POLICY IF EXISTS "Firefighters can update station booking status" ON training_bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON training_bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON training_bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON training_bookings;
DROP POLICY IF EXISTS "Users can cancel own bookings" ON training_bookings;

-- Drop the foreign key constraint
ALTER TABLE training_bookings 
    DROP CONSTRAINT IF EXISTS training_bookings_station_id_fkey;

-- Drop the trigger with CASCADE to handle dependencies
DROP TRIGGER IF EXISTS update_training_bookings_updated_at ON training_bookings CASCADE;

-- Drop and recreate the function with CASCADE to handle all dependent triggers
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Recreate the function for all tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.updated_at = OLD.updated_at THEN
            NEW.updated_at = NOW();
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers for other tables that were dropped
CREATE TRIGGER update_emergency_calls_updated_at
    BEFORE UPDATE ON emergency_calls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at
    BEFORE UPDATE ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create a temporary table with the correct structure
CREATE TABLE training_bookings_new (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    station_id TEXT NOT NULL,
    company_name TEXT,
    training_date DATE NOT NULL,
    training_time TIME NOT NULL,
    num_participants INTEGER NOT NULL CHECK (num_participants > 0 AND num_participants <= 20),
    status training_status DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Copy data from the old table to the new one, ensuring station_id is TEXT
INSERT INTO training_bookings_new (
    id, user_id, station_id, company_name, training_date, 
    training_time, num_participants, status, notes, 
    created_at, updated_at
)
SELECT 
    id, 
    user_id, 
    station_id::TEXT,  -- Explicitly cast to TEXT
    company_name, 
    training_date, 
    training_time, 
    num_participants, 
    status, 
    notes, 
    created_at, 
    updated_at
FROM training_bookings;

-- Drop the old table and rename the new one
DROP TABLE training_bookings;
ALTER TABLE training_bookings_new RENAME TO training_bookings;

-- Recreate indexes
CREATE INDEX idx_training_bookings_user_id ON training_bookings(user_id);
CREATE INDEX idx_training_bookings_station_id ON training_bookings(station_id);
CREATE INDEX idx_training_bookings_status ON training_bookings(status);
CREATE INDEX idx_training_bookings_date ON training_bookings(training_date);

-- Add the foreign key constraint
ALTER TABLE training_bookings
    ADD CONSTRAINT training_bookings_station_id_fkey 
    FOREIGN KEY (station_id) 
    REFERENCES firefighters(station_id);

-- Recreate the trigger for training_bookings
CREATE TRIGGER update_training_bookings_updated_at
    BEFORE UPDATE ON training_bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Recreate the policies with explicit TEXT casting
CREATE POLICY "Users can view own bookings"
    ON training_bookings
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookings"
    ON training_bookings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings"
    ON training_bookings
    FOR UPDATE
    USING (auth.uid() = user_id AND status IN ('pending', 'confirmed'));

CREATE POLICY "Users can cancel own bookings"
    ON training_bookings
    FOR UPDATE
    USING (auth.uid() = user_id AND status = 'pending')
    WITH CHECK (status = 'cancelled');

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
COMMENT ON TABLE training_bookings IS 'Stores training session bookings made by users';
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