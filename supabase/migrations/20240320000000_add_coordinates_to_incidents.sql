-- Add latitude and longitude columns to incidents table
ALTER TABLE incidents
ADD COLUMN latitude DOUBLE PRECISION,
ADD COLUMN longitude DOUBLE PRECISION;

-- Update existing rows to have null coordinates
UPDATE incidents SET latitude = NULL, longitude = NULL;

-- Add comment to explain the columns
COMMENT ON COLUMN incidents.latitude IS 'Latitude coordinate of the incident location';
COMMENT ON COLUMN incidents.longitude IS 'Longitude coordinate of the incident location'; 