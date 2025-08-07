-- Add location_address column to incidents table
-- This column will store human-readable addresses instead of just coordinates

ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS location_address TEXT;

-- Add comment to document the column
COMMENT ON COLUMN incidents.location_address IS 'Human-readable address (e.g., "123 Main St, City, Country")';

-- Optional: Create an index for faster searching by address
CREATE INDEX IF NOT EXISTS idx_incidents_location_address 
ON incidents USING gin(to_tsvector('english', location_address));

-- Show the updated table structure
\d incidents;

-- Show a sample of incidents to verify the column was added
SELECT id, location, location_address, created_at 
FROM incidents 
ORDER BY created_at DESC 
LIMIT 5;
