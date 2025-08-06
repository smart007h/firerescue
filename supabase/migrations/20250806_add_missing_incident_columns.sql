-- Add missing columns to incidents table for enhanced functionality

-- Add dispatcher_id column if it doesn't exist
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS dispatcher_id text;

-- Add station_id column if it doesn't exist  
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS station_id text;

-- Add separate latitude and longitude columns for better coordinate handling
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS latitude double precision;

ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS longitude double precision;

-- Add location_address column for human-readable addresses
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS location_address text;

-- Create index on dispatcher_id for better query performance
CREATE INDEX IF NOT EXISTS idx_incidents_dispatcher_id ON incidents(dispatcher_id);

-- Create index on station_id for better query performance  
CREATE INDEX IF NOT EXISTS idx_incidents_station_id ON incidents(station_id);

-- Create index on coordinates for spatial queries
CREATE INDEX IF NOT EXISTS idx_incidents_coordinates ON incidents(latitude, longitude);

-- Update RLS policies to allow dispatchers to view assigned incidents
CREATE POLICY "Dispatchers can view assigned incidents" 
    ON incidents FOR SELECT
    USING (
        -- Allow access if user is the reporter
        auth.uid() = reported_by 
        OR 
        -- Allow access if user is assigned dispatcher (check against dispatcher table)
        EXISTS (
            SELECT 1 FROM dispatchers d 
            WHERE d.id = dispatcher_id 
            AND d.user_id = auth.uid()
        )
    );

-- Update policy for incident updates to allow dispatchers
DROP POLICY IF EXISTS "Users can update their own incidents" ON incidents;
CREATE POLICY "Users and dispatchers can update incidents"
    ON incidents FOR UPDATE
    USING (
        -- Allow if user is the reporter
        auth.uid() = reported_by 
        OR 
        -- Allow if user is assigned dispatcher
        EXISTS (
            SELECT 1 FROM dispatchers d 
            WHERE d.id = dispatcher_id 
            AND d.user_id = auth.uid()
        )
    );

-- Add comments for documentation
COMMENT ON COLUMN incidents.dispatcher_id IS 'ID of the dispatcher assigned to this incident';
COMMENT ON COLUMN incidents.station_id IS 'ID of the fire station assigned to this incident';
COMMENT ON COLUMN incidents.latitude IS 'Latitude coordinate of the incident location';
COMMENT ON COLUMN incidents.longitude IS 'Longitude coordinate of the incident location';
COMMENT ON COLUMN incidents.location_address IS 'Human-readable address of the incident location';
