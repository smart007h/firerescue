-- Drop existing table if it exists
DROP TABLE IF EXISTS firefighters CASCADE;

-- Create firefighters table
CREATE TABLE firefighters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id TEXT NOT NULL,
    station_name TEXT NOT NULL,
    station_region TEXT NOT NULL,
    station_contact TEXT NOT NULL,
    station_address TEXT NOT NULL,
    station_location TEXT NOT NULL,
    station_email TEXT UNIQUE NOT NULL,
    station_password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS
ALTER TABLE firefighters ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view firefighters"
    ON firefighters FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can update firefighters"
    ON firefighters FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Create index for faster queries
CREATE INDEX idx_firefighters_station_id ON firefighters(station_id); 