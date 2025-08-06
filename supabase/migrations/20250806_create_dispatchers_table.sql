-- Create dispatchers table for dispatcher management

-- Drop existing table if it exists (for clean recreation)
DROP TABLE IF EXISTS dispatchers CASCADE;

-- Create dispatchers table
CREATE TABLE dispatchers (
    id TEXT PRIMARY KEY,  -- Custom ID like "FS001", "FS002", etc.
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- Link to auth user
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    station_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE dispatchers ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_dispatchers_user_id ON dispatchers(user_id);
CREATE INDEX idx_dispatchers_station_id ON dispatchers(station_id);
CREATE INDEX idx_dispatchers_email ON dispatchers(email);
CREATE INDEX idx_dispatchers_is_active ON dispatchers(is_active);

-- Create policies for dispatcher access
CREATE POLICY "Dispatchers can view all dispatcher records"
    ON dispatchers FOR SELECT
    USING (true);  -- All authenticated users can view dispatcher info

CREATE POLICY "Dispatchers can update their own records"
    ON dispatchers FOR UPDATE
    USING (user_id = auth.uid());

-- Allow service role to manage all dispatcher records
CREATE POLICY "Service role can manage dispatchers"
    ON dispatchers FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_dispatchers_updated_at
    BEFORE UPDATE ON dispatchers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON dispatchers TO authenticated;
GRANT ALL ON dispatchers TO service_role;

-- Insert sample dispatchers
INSERT INTO dispatchers (id, name, email, phone, station_id, is_active) VALUES
('FS001', 'John Dispatcher', 'john.dispatcher@firerescue.com', '+233201234567', 'STATION_001', true),
('FS002', 'Sarah Commander', 'sarah.commander@firerescue.com', '+233201234568', 'STATION_002', true),
('FS003', 'Mike Controller', 'mike.controller@firerescue.com', '+233201234569', 'STATION_003', true)
ON CONFLICT (id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE dispatchers IS 'Fire rescue dispatchers who coordinate emergency responses';
COMMENT ON COLUMN dispatchers.id IS 'Custom dispatcher ID (e.g., FS001, FS002)';
COMMENT ON COLUMN dispatchers.user_id IS 'Reference to auth.users for login credentials';
COMMENT ON COLUMN dispatchers.station_id IS 'Fire station this dispatcher is assigned to';
COMMENT ON COLUMN dispatchers.is_active IS 'Whether the dispatcher is currently active/available';
