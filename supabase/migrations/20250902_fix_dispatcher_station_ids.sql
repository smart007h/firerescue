-- Fix dispatcher station_id values to match actual station IDs

-- Update existing dispatcher records to use correct station IDs
UPDATE dispatchers 
SET station_id = 'FS001'
WHERE station_id = 'STATION_001';

UPDATE dispatchers 
SET station_id = 'FS002'
WHERE station_id = 'STATION_002';

UPDATE dispatchers 
SET station_id = 'FS003'
WHERE station_id = 'STATION_003';

UPDATE dispatchers 
SET station_id = 'FS004'
WHERE station_id = 'STATION_004';

UPDATE dispatchers 
SET station_id = 'FS005'
WHERE station_id = 'STATION_005';

UPDATE dispatchers 
SET station_id = 'FS006'
WHERE station_id = 'STATION_006';

UPDATE dispatchers 
SET station_id = 'FS007'
WHERE station_id = 'STATION_007';

UPDATE dispatchers 
SET station_id = 'FS008'
WHERE station_id = 'STATION_008';

UPDATE dispatchers 
SET station_id = 'FS009'
WHERE station_id = 'STATION_009';

UPDATE dispatchers 
SET station_id = 'FS010'
WHERE station_id = 'STATION_010';

-- Insert additional dispatchers for stations that don't have them yet
INSERT INTO dispatchers (id, name, email, phone, station_id, is_active) VALUES
('FS004', 'Mary Coordinator', 'mary.coordinator@firerescue.com', '+233201234570', 'FS004', true),
('FS005', 'David Chief', 'david.chief@firerescue.com', '+233201234571', 'FS005', true),
('FS006', 'Lisa Manager', 'lisa.manager@firerescue.com', '+233201234572', 'FS006', true),
('FS007', 'Peter Director', 'peter.director@firerescue.com', '+233201234573', 'FS007', true),
('FS008', 'Helen Supervisor', 'helen.supervisor@firerescue.com', '+233201234574', 'FS008', true),
('FS009', 'Robert Lead', 'robert.lead@firerescue.com', '+233201234575', 'FS009', true),
('FS010', 'Anna Control', 'anna.control@firerescue.com', '+233201234576', 'FS010', true)
ON CONFLICT (id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE dispatchers IS 'Fire rescue dispatchers who coordinate emergency responses - updated with correct station IDs';
