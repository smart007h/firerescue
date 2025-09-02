-- Add station_id column to certificate_applications table for station-specific filtering
-- Execute this in your Supabase project's SQL Editor

-- Add station_id column if it doesn't exist
ALTER TABLE certificate_applications 
ADD COLUMN IF NOT EXISTS station_id TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_certificate_applications_station_id 
ON certificate_applications(station_id);

-- Update existing applications to have appropriate station_id based on location
-- This assigns stations based on geographical regions (Tema is part of Greater Accra)
UPDATE certificate_applications 
SET station_id = CASE
    -- Greater Accra Region (includes Tema as it's part of Greater Accra)
    WHEN LOWER(premises_location) LIKE '%tema%' OR LOWER(premises_address) LIKE '%tema%' THEN 'FS001'
    WHEN LOWER(premises_location) LIKE '%accra%' OR LOWER(premises_address) LIKE '%accra%' THEN 'FS001'
    WHEN LOWER(premises_location) LIKE '%east legon%' OR LOWER(premises_address) LIKE '%east legon%' THEN 'FS001'
    WHEN LOWER(premises_location) LIKE '%adenta%' OR LOWER(premises_address) LIKE '%adenta%' THEN 'FS001'
    WHEN LOWER(premises_location) LIKE '%madina%' OR LOWER(premises_address) LIKE '%madina%' THEN 'FS001'
    WHEN LOWER(premises_location) LIKE '%spintex%' OR LOWER(premises_address) LIKE '%spintex%' THEN 'FS001'
    
    -- Other regions
    WHEN LOWER(premises_location) LIKE '%kumasi%' OR LOWER(premises_address) LIKE '%kumasi%' THEN 'FS002'
    WHEN LOWER(premises_location) LIKE '%tamale%' OR LOWER(premises_address) LIKE '%tamale%' THEN 'FS004'
    WHEN LOWER(premises_location) LIKE '%cape coast%' OR LOWER(premises_address) LIKE '%cape coast%' THEN 'FS006'
    
    -- Default to Accra Central Station for Greater Accra region
    ELSE 'FS001'
END
WHERE station_id IS NULL;

-- Create RLS policy for station-specific access to certificate applications
-- Note: This assumes firefighters are authenticated with their station_id

-- Enable RLS on certificate_applications if not already enabled
ALTER TABLE certificate_applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Firefighters can view their station certificates" ON certificate_applications;
DROP POLICY IF EXISTS "Firefighters can update their station certificates" ON certificate_applications;
DROP POLICY IF EXISTS "Anyone can insert certificate applications" ON certificate_applications;

-- Policy for firefighters to view only their station's certificate applications
CREATE POLICY "Firefighters can view their station certificates"
    ON certificate_applications
    FOR SELECT
    USING (
        -- Allow access if user has matching station_id in AsyncStorage/session
        -- Or if accessing via service role key (for admin access)
        auth.role() = 'service_role'
        OR
        EXISTS (
            SELECT 1 FROM firefighters
            WHERE firefighters.station_id::TEXT = certificate_applications.station_id::TEXT
            AND firefighters.id::UUID = auth.uid()::UUID
        )
    );

-- Policy for firefighters to update certificate applications from their station
CREATE POLICY "Firefighters can update their station certificates"
    ON certificate_applications
    FOR UPDATE
    USING (
        auth.role() = 'service_role'
        OR
        EXISTS (
            SELECT 1 FROM firefighters
            WHERE firefighters.station_id::TEXT = certificate_applications.station_id::TEXT
            AND firefighters.id::UUID = auth.uid()::UUID
        )
    );

-- Policy to allow anyone to insert new certificate applications
-- (Citizens should be able to apply)
CREATE POLICY "Anyone can insert certificate applications"
    ON certificate_applications
    FOR INSERT
    WITH CHECK (true);

-- Verify the setup
SELECT 
    ca.id,
    ca.applicant_name,
    ca.premises_address,
    ca.premises_location,
    ca.station_id,
    ca.status,
    ca.created_at,
    -- Also show which station this would go to
    f.station_name,
    f.station_region
FROM certificate_applications ca
LEFT JOIN firefighters f ON f.station_id = ca.station_id
ORDER BY ca.created_at DESC
LIMIT 10;

-- Show station assignment summary
SELECT 
    station_id,
    COUNT(*) as application_count,
    f.station_name,
    f.station_region
FROM certificate_applications ca
LEFT JOIN firefighters f ON f.station_id = ca.station_id
GROUP BY station_id, f.station_name, f.station_region
ORDER BY application_count DESC;
