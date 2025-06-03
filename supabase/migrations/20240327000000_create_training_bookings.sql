-- Drop existing type if it exists
DROP TYPE IF EXISTS training_status CASCADE;

-- Create enum for training status
CREATE TYPE training_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- Drop existing table if it exists
DROP TABLE IF EXISTS training_bookings CASCADE;

-- Create training_bookings table with TEXT station_id
CREATE TABLE training_bookings (
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT training_bookings_station_id_check CHECK (station_id ~ '^FS[0-9]{3}$')  -- Ensure station_id format is FS001, FS002, etc.
);

-- Create index for faster queries
CREATE INDEX idx_training_bookings_user_id ON training_bookings(user_id);
CREATE INDEX idx_training_bookings_station_id ON training_bookings(station_id);
CREATE INDEX idx_training_bookings_status ON training_bookings(status);
CREATE INDEX idx_training_bookings_date ON training_bookings(training_date);

-- Enable Row Level Security
ALTER TABLE training_bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for training_bookings
-- Users can view their own bookings
CREATE POLICY "Users can view own bookings"
    ON training_bookings
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own bookings
CREATE POLICY "Users can create bookings"
    ON training_bookings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending or confirmed bookings
CREATE POLICY "Users can update own bookings"
    ON training_bookings
    FOR UPDATE
    USING (auth.uid() = user_id AND status IN ('pending', 'confirmed'));

-- Users can cancel their own bookings
CREATE POLICY "Users can cancel own bookings"
    ON training_bookings
    FOR UPDATE
    USING (auth.uid() = user_id AND status = 'pending')
    WITH CHECK (status = 'cancelled');

-- Firefighters can view bookings for their station
CREATE POLICY "Firefighters can view station bookings"
    ON training_bookings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM firefighters
            WHERE firefighters.station_id = training_bookings.station_id
            AND firefighters.id = auth.uid()
        )
    );

-- Firefighters can update booking status for their station
CREATE POLICY "Firefighters can update station booking status"
    ON training_bookings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM firefighters
            WHERE firefighters.station_id = training_bookings.station_id
            AND firefighters.id = auth.uid()
        )
    );

-- Create function to update updated_at timestamp
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

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_training_bookings_updated_at
    BEFORE UPDATE ON training_bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraint referencing firefighters.station_id
ALTER TABLE training_bookings
    ADD CONSTRAINT training_bookings_station_id_fkey 
    FOREIGN KEY (station_id) 
    REFERENCES firefighters(station_id);

-- Add documentation
COMMENT ON TABLE training_bookings IS 'Stores training session bookings made by users';
COMMENT ON COLUMN training_bookings.station_id IS 'References firefighters.station_id (e.g., "FS002"). Must match pattern FS###.';
COMMENT ON CONSTRAINT training_bookings_station_id_check ON training_bookings IS 'Ensures station_id follows the format FS### (e.g., FS001, FS002)';

-- Verify the table structure
DO $$ 
BEGIN
    -- Verify station_id is TEXT
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'training_bookings' 
        AND column_name = 'station_id' 
        AND data_type = 'text'
    ) THEN
        RAISE EXCEPTION 'training_bookings.station_id is not TEXT type';
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

    -- Verify check constraint
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'training_bookings'
        AND tc.constraint_name = 'training_bookings_station_id_check'
    ) THEN
        RAISE EXCEPTION 'Check constraint for station_id format not properly set up';
    END IF;
END $$; 