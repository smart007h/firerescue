-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Firefighters can view incidents assigned to their station" ON incidents;
DROP POLICY IF EXISTS "Users can insert station_id when creating incidents" ON incidents;
DROP POLICY IF EXISTS "Firefighters can update incidents assigned to their station" ON incidents;
DROP POLICY IF EXISTS "Users can view their own incidents" ON incidents;
DROP POLICY IF EXISTS "Users can insert their own incidents" ON incidents;
DROP POLICY IF EXISTS "Users can update their own incidents" ON incidents;
DROP POLICY IF EXISTS "Users can delete their own incidents" ON incidents;

-- Add station_id column to incidents table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'incidents' 
        AND column_name = 'station_id'
    ) THEN
        ALTER TABLE incidents
        ADD COLUMN station_id TEXT REFERENCES firefighters(station_id);
    END IF;
END $$;

-- Add comment to explain the column
COMMENT ON COLUMN incidents.station_id IS 'Reference to the fire station assigned to handle this incident';

-- Enable RLS if not already enabled
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow anyone to view incidents
CREATE POLICY "Allow anyone to view incidents"
    ON incidents FOR SELECT
    USING (true);

-- Create policy for inserting incidents
CREATE POLICY "Users can insert incidents"
    ON incidents FOR INSERT
    WITH CHECK (true);

-- Create policy for updating incidents
CREATE POLICY "Anyone can update incidents"
    ON incidents FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Update foreign key constraint for reported_by
ALTER TABLE incidents
DROP CONSTRAINT IF EXISTS incidents_reported_by_fkey,
ADD CONSTRAINT incidents_reported_by_fkey 
    FOREIGN KEY (reported_by) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE; 