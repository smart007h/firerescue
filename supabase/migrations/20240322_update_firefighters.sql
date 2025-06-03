-- Drop existing table if it exists to start fresh
DROP TABLE IF EXISTS firefighters CASCADE;

-- Create firefighters table with correct structure
CREATE TABLE firefighters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id TEXT UNIQUE NOT NULL,
    station_name TEXT NOT NULL,
    station_region TEXT NOT NULL,
    station_contact TEXT NOT NULL,
    station_address TEXT NOT NULL,
    station_location TEXT NOT NULL,
    station_email TEXT NOT NULL,
    station_password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Insert fire station data with explicit UUIDs
INSERT INTO firefighters (
    id,
    station_id,
    station_name,
    station_region,
    station_contact,
    station_address,
    station_location,
    station_email,
    station_password,
    is_active
) VALUES 
    (gen_random_uuid(), 'FS001', 'Accra Central Fire Station', 'Greater Accra Region', '+233 30 222 3344', 
     'Independence Avenue, Accra Central, Accra', '5.6034, -0.1870', 'station001@firerescue.com', 'FireStation101!', true),
    
    (gen_random_uuid(), 'FS002', 'Kumasi Central Fire Station', 'Ashanti Region', '+233 32 202 4455', 
     'Adum, Kumasi Central, Kumasi', '6.6885, -1.6244', 'station002@firerescue.com', 'FireStation102!', true),
    
    (gen_random_uuid(), 'FS003', 'Takoradi Fire Station', 'Western Region', '+233 31 202 5566', 
     'Harbour Road, Takoradi Central, Takoradi', '4.9016, -1.7831', 'station003@firerescue.com', 'FireStation103!', true),
    
    (gen_random_uuid(), 'FS004', 'Tamale Fire Station', 'Northern Region', '+233 37 202 6677', 
     'Central Market Road, Tamale Central, Tamale', '9.4008, -0.8393', 'station004@firerescue.com', 'FireStation104!', true),
    
    (gen_random_uuid(), 'FS005', 'Tema Fire Station', 'Greater Accra Region', '+233 22 202 7788', 
     'Community 1, Tema Central, Tema', '5.6739, -0.0081', 'station005@firerescue.com', 'FireStation105!', true),
    
    (gen_random_uuid(), 'FS006', 'Cape Coast Fire Station', 'Central Region', '+233 33 202 8899', 
     'Victoria Road, Cape Coast Central, Cape Coast', '5.1054, -1.2466', 'station006@firerescue.com', 'FireStation106!', true),
    
    (gen_random_uuid(), 'FS007', 'Koforidua Fire Station', 'Eastern Region', '+233 34 202 9900', 
     'Central Market Road, Koforidua Central, Koforidua', '6.0919, -0.2591', 'station007@firerescue.com', 'FireStation107!', true),
    
    (gen_random_uuid(), 'FS008', 'Sunyani Fire Station', 'Bono Region', '+233 35 202 0011', 
     'Central Market Road, Sunyani Central, Sunyani', '7.3349, -2.3123', 'station008@firerescue.com', 'FireStation108!', true),
    
    (gen_random_uuid(), 'FS009', 'Ho Fire Station', 'Volta Region', '+233 36 202 1122', 
     'Central Market Road, Ho Central, Ho', '6.6038, 0.4710', 'station009@firerescue.com', 'FireStation109!', true),
    
    (gen_random_uuid(), 'FS010', 'Bolgatanga Fire Station', 'Upper East Region', '+233 38 202 2233', 
     'Central Market Road, Bolgatanga Central, Bolgatanga', '10.7854, -0.8513', 'station010@firerescue.com', 'FireStation110!', true)
ON CONFLICT (station_id) DO UPDATE SET
    station_name = EXCLUDED.station_name,
    station_region = EXCLUDED.station_region,
    station_contact = EXCLUDED.station_contact,
    station_address = EXCLUDED.station_address,
    station_location = EXCLUDED.station_location,
    station_email = EXCLUDED.station_email,
    station_password = EXCLUDED.station_password,
    is_active = EXCLUDED.is_active,
    updated_at = TIMEZONE('utc'::text, NOW());

-- Delete existing auth.users entries for our stations
DELETE FROM auth.users 
WHERE email LIKE '%@firerescue.com';

-- Create auth.users entries for each station
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    role
)
SELECT 
    f.id,
    f.station_email,
    crypt(f.station_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated'
FROM firefighters f;

-- Enable Row Level Security
ALTER TABLE firefighters ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Firefighters can view their own data" ON firefighters;
CREATE POLICY "Firefighters can view their own data" ON firefighters
    FOR SELECT
    USING (true);  -- Allow all SELECT operations

DROP POLICY IF EXISTS "Firefighters can update their own data" ON firefighters;
CREATE POLICY "Firefighters can update their own data" ON firefighters
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Add policy for login
DROP POLICY IF EXISTS "Allow login check" ON firefighters;
CREATE POLICY "Allow login check" ON firefighters
    FOR SELECT
    USING (true);  -- Allow checking station credentials 