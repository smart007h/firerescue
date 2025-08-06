-- Create firefighters table with station information

-- Drop existing table if it exists (for clean recreation)
DROP TABLE IF EXISTS firefighters CASCADE;

-- Create firefighters table
CREATE TABLE firefighters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    station_id TEXT NOT NULL,
    station_name TEXT NOT NULL,
    station_address TEXT,
    station_contact TEXT,
    station_region TEXT,
    rank TEXT DEFAULT 'firefighter',
    is_active BOOLEAN DEFAULT true,
    years_of_service INTEGER DEFAULT 0,
    specializations TEXT[], -- Array of specializations
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE firefighters ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_firefighters_user_id ON firefighters(user_id);
CREATE INDEX idx_firefighters_station_id ON firefighters(station_id);
CREATE INDEX idx_firefighters_email ON firefighters(email);
CREATE INDEX idx_firefighters_is_active ON firefighters(is_active);

-- Create policies for firefighter access
CREATE POLICY "Anyone can view firefighter station info"
    ON firefighters FOR SELECT
    USING (true);  -- All users can view firefighter/station info

CREATE POLICY "Firefighters can update their own records"
    ON firefighters FOR UPDATE
    USING (user_id = auth.uid());

-- Allow service role to manage all firefighter records
CREATE POLICY "Service role can manage firefighters"
    ON firefighters FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_firefighters_updated_at
    BEFORE UPDATE ON firefighters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON firefighters TO authenticated;
GRANT ALL ON firefighters TO service_role;

-- Insert sample fire stations/firefighters
INSERT INTO firefighters (station_id, station_name, station_address, station_contact, station_region, name, email, phone, rank, years_of_service, specializations) VALUES
('STATION_001', 'Accra Central Fire Station', '123 Liberation Road, Accra', '+233302123456', 'Greater Accra', 'Captain James Asante', 'james.asante@firerescue.gov.gh', '+233241234567', 'captain', 15, ARRAY['rescue', 'hazmat']),
('STATION_001', 'Accra Central Fire Station', '123 Liberation Road, Accra', '+233302123456', 'Greater Accra', 'Lieutenant Mary Osei', 'mary.osei@firerescue.gov.gh', '+233241234568', 'lieutenant', 8, ARRAY['medical', 'rescue']),
('STATION_002', 'Kumasi Fire Station', '456 Manhyia Palace Road, Kumasi', '+233322123456', 'Ashanti', 'Captain Samuel Bonsu', 'samuel.bonsu@firerescue.gov.gh', '+233241234569', 'captain', 12, ARRAY['wildfire', 'rescue']),
('STATION_002', 'Kumasi Fire Station', '456 Manhyia Palace Road, Kumasi', '+233322123456', 'Ashanti', 'Sergeant Grace Ampong', 'grace.ampong@firerescue.gov.gh', '+233241234570', 'sergeant', 6, ARRAY['medical', 'technical']),
('STATION_003', 'Takoradi Fire Station', '789 Market Circle, Takoradi', '+233312123456', 'Western', 'Lieutenant Emmanuel Mensah', 'emmanuel.mensah@firerescue.gov.gh', '+233241234571', 'lieutenant', 9, ARRAY['marine', 'rescue']),
('STATION_003', 'Takoradi Fire Station', '789 Market Circle, Takoradi', '+233312123456', 'Western', 'Firefighter Joseph Atta', 'joseph.atta@firerescue.gov.gh', '+233241234572', 'firefighter', 3, ARRAY['basic', 'medical'])
ON CONFLICT (email) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE firefighters IS 'Fire rescue personnel and their station assignments';
COMMENT ON COLUMN firefighters.station_id IS 'Unique identifier for the fire station';
COMMENT ON COLUMN firefighters.station_name IS 'Human-readable name of the fire station';
COMMENT ON COLUMN firefighters.station_address IS 'Physical address of the fire station';
COMMENT ON COLUMN firefighters.station_contact IS 'Contact phone number for the fire station';
COMMENT ON COLUMN firefighters.station_region IS 'Administrative region where the station is located';
COMMENT ON COLUMN firefighters.specializations IS 'Array of firefighter specializations/certifications';
