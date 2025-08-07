-- =====================================================
-- INCIDENT HISTORY FIX - SQL COMMANDS FOR SUPABASE
-- =====================================================
-- 
-- Run these commands in your Supabase Dashboard > SQL Editor
-- to fix the missing incident history columns
--

-- 1. Add missing columns to incidents table
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS location_address text;

ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS latitude double precision;

ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS longitude double precision;

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incidents_coordinates ON incidents(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_incidents_location_address ON incidents(location_address);

-- 3. Add comments for documentation
COMMENT ON COLUMN incidents.latitude IS 'Latitude coordinate of the incident location';
COMMENT ON COLUMN incidents.longitude IS 'Longitude coordinate of the incident location';
COMMENT ON COLUMN incidents.location_address IS 'Human-readable address of the incident location';

-- 4. Update existing incidents with missing location data
-- (This will populate latitude, longitude, and basic location_address for existing records)
UPDATE incidents 
SET 
  latitude = CAST(SPLIT_PART(location, ',', 1) AS double precision),
  longitude = CAST(SPLIT_PART(location, ',', 2) AS double precision),
  location_address = CASE 
    WHEN location ~ '^-?\d+\.?\d*,-?\d+\.?\d*$' THEN 
      'Coordinates: ' || SPLIT_PART(location, ',', 1) || ', ' || SPLIT_PART(location, ',', 2)
    ELSE 
      location
  END
WHERE 
  (latitude IS NULL OR longitude IS NULL OR location_address IS NULL)
  AND location IS NOT NULL 
  AND location != '';

-- 5. Verify the changes
SELECT 
  COUNT(*) as total_incidents,
  COUNT(location_address) as with_address,
  COUNT(latitude) as with_latitude,
  COUNT(longitude) as with_longitude
FROM incidents;

-- 6. Show recent incidents with new fields
SELECT 
  id,
  incident_type,
  status,
  location,
  location_address,
  latitude,
  longitude,
  created_at
FROM incidents 
ORDER BY created_at DESC 
LIMIT 5;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check for incidents missing location data
SELECT 
  'Missing location_address' as issue,
  COUNT(*) as count
FROM incidents 
WHERE location_address IS NULL
UNION ALL
SELECT 
  'Missing coordinates' as issue,
  COUNT(*) as count
FROM incidents 
WHERE latitude IS NULL OR longitude IS NULL;

-- Show incidents created today
SELECT 
  id,
  incident_type,
  status,
  location_address,
  created_at
FROM incidents 
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;
