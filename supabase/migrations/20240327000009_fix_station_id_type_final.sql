-- First, let's check the current state of the tables
DO $$ 
DECLARE
    training_bookings_type text;
    firefighters_type text;
BEGIN
    -- Get the current type of station_id in both tables
    SELECT data_type INTO training_bookings_type
    FROM information_schema.columns 
    WHERE table_name = 'training_bookings' 
    AND column_name = 'station_id';

    SELECT data_type INTO firefighters_type
    FROM information_schema.columns 
    WHERE table_name = 'firefighters' 
    AND column_name = 'station_id';

    -- Log the current types
    RAISE NOTICE 'Current types - training_bookings.station_id: %, firefighters.station_id: %', 
        training_bookings_type, firefighters_type;
END $$;

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

-- Drop the trigger
DROP TRIGGER IF EXISTS update_training_bookings_updated_at ON training_bookings;

-- Create a temporary table with the correct structure
CREATE TABLE training_bookings_new (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    station_id TEXT NOT NULL,  -- Explicitly defined as TEXT
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
    CASE 
        WHEN station_id IS NULL THEN NULL
        ELSE station_id::TEXT  -- Explicitly cast to TEXT
    END as station_id,
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
DROP TABLE IF EXISTS training_bookings;
ALTER TABLE training_bookings_new RENAME TO training_bookings;

-- Recreate indexes
CREATE INDEX idx_training_bookings_user_id ON training_bookings(user_id);
CREATE INDEX idx_training_bookings_station_id ON training_bookings(station_id);
CREATE INDEX idx_training_bookings_status ON training_bookings(status);
CREATE INDEX idx_training_bookings_date ON training_bookings(training_date);

-- Ensure firefighters.station_id is TEXT
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'firefighters' 
        AND column_name = 'station_id' 
        AND data_type != 'text'
    ) THEN
        ALTER TABLE firefighters 
            ALTER COLUMN station_id TYPE TEXT USING station_id::TEXT;
    END IF;
END $$;

-- Add the foreign key constraint
ALTER TABLE training_bookings
    ADD CONSTRAINT training_bookings_station_id_fkey 
    FOREIGN KEY (station_id) 
    REFERENCES firefighters(station_id);

-- Recreate the trigger function if it doesn't exist
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

-- Recreate the trigger
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

-- Verify the column types after migration
DO $$ 
BEGIN
    -- Verify training_bookings.station_id
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'training_bookings' 
        AND column_name = 'station_id' 
        AND data_type != 'text'
    ) THEN
        RAISE EXCEPTION 'training_bookings.station_id is not TEXT type after migration';
    END IF;

    -- Verify firefighters.station_id
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'firefighters' 
        AND column_name = 'station_id' 
        AND data_type != 'text'
    ) THEN
        RAISE EXCEPTION 'firefighters.station_id is not TEXT type after migration';
    END IF;

    -- Verify foreign key constraint
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'training_bookings'
        AND tc.constraint_name = 'training_bookings_station_id_fkey'
        AND ccu.table_name = 'firefighters'
        AND ccu.column_name = 'station_id'
    ) THEN
        RAISE EXCEPTION 'Foreign key constraint not properly set up';
    END IF;
END $$; 