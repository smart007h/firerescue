-- Add location columns to firefighters table if they don't exist
ALTER TABLE firefighters
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS address TEXT;

-- Update existing fire stations with their locations
UPDATE firefighters
SET 
  address = CASE station_id
    WHEN 'FS001' THEN 'Independence Avenue, Accra Central, Accra'
    WHEN 'FS002' THEN 'Adum, Kumasi Central, Kumasi'
    WHEN 'FS003' THEN 'Harbour Road, Takoradi Central, Takoradi'
    WHEN 'FS004' THEN 'Central Market Road, Tamale Central, Tamale'
    WHEN 'FS005' THEN 'Community 1, Tema Central, Tema'
    WHEN 'FS006' THEN 'Victoria Road, Cape Coast Central, Cape Coast'
    WHEN 'FS007' THEN 'Central Market Road, Koforidua Central, Koforidua'
    WHEN 'FS008' THEN 'Central Market Road, Sunyani Central, Sunyani'
    WHEN 'FS009' THEN 'Central Market Road, Ho Central, Ho'
    WHEN 'FS010' THEN 'Central Market Road, Bolgatanga Central, Bolgatanga'
  END,
  latitude = CASE station_id
    WHEN 'FS001' THEN 5.6034
    WHEN 'FS002' THEN 6.6885
    WHEN 'FS003' THEN 4.9016
    WHEN 'FS004' THEN 9.4008
    WHEN 'FS005' THEN 5.6739
    WHEN 'FS006' THEN 5.1054
    WHEN 'FS007' THEN 6.0919
    WHEN 'FS008' THEN 7.3349
    WHEN 'FS009' THEN 6.6038
    WHEN 'FS010' THEN 10.7854
  END,
  longitude = CASE station_id
    WHEN 'FS001' THEN -0.1870
    WHEN 'FS002' THEN -1.6244
    WHEN 'FS003' THEN -1.7831
    WHEN 'FS004' THEN -0.8393
    WHEN 'FS005' THEN -0.0081
    WHEN 'FS006' THEN -1.2466
    WHEN 'FS007' THEN -0.2591
    WHEN 'FS008' THEN -2.3123
    WHEN 'FS009' THEN 0.4710
    WHEN 'FS010' THEN -0.8513
  END
WHERE station_id IN ('FS001', 'FS002', 'FS003', 'FS004', 'FS005', 'FS006', 'FS007', 'FS008', 'FS009', 'FS010'); 