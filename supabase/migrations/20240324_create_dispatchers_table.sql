-- Create dispatchers table
CREATE TABLE IF NOT EXISTS dispatchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id TEXT NOT NULL REFERENCES firefighters(station_id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    phone_number TEXT,
    email TEXT,
    shift_start TIME,
    shift_end TIME,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(station_id) -- Each station can only have one dispatcher team
);

-- Add comment to explain the table
COMMENT ON TABLE dispatchers IS 'Stores information about dispatcher teams assigned to each fire station';

-- Enable RLS
ALTER TABLE dispatchers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view dispatchers"
    ON dispatchers FOR SELECT
    USING (true);

CREATE POLICY "Only authenticated users can insert dispatchers"
    ON dispatchers FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can update dispatchers"
    ON dispatchers FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_dispatchers_updated_at
    BEFORE UPDATE ON dispatchers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 