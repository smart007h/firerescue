-- Add role column to firefighters table
ALTER TABLE firefighters
ADD COLUMN role VARCHAR(20);

-- Update existing records with roles based on their names
UPDATE firefighters
SET role = CASE 
    WHEN station_name LIKE '%Team Leader%' THEN 'team_leader'
    WHEN station_name LIKE '%Firefighter%' THEN 'firefighter'
    ELSE NULL
END; 