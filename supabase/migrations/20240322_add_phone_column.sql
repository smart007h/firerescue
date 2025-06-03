-- Add phone column to firefighters table
ALTER TABLE firefighters
ADD COLUMN station_phone VARCHAR(20);

-- Update existing records with phone numbers
UPDATE firefighters
SET station_phone = CASE 
    WHEN station_id = 'FS001' THEN '+1234567890'
    WHEN station_id = 'FS002' THEN '+1234567894'
    WHEN station_id = 'FS003' THEN '+1234567898'
    WHEN station_id = 'FS004' THEN '+1234567902'
    WHEN station_id = 'FS005' THEN '+1234567906'
    ELSE NULL
END
WHERE station_name LIKE '%Team Leader%';

UPDATE firefighters
SET station_phone = CASE 
    WHEN station_id = 'FS001' THEN '+1234567891'
    WHEN station_id = 'FS002' THEN '+1234567895'
    WHEN station_id = 'FS003' THEN '+1234567899'
    WHEN station_id = 'FS004' THEN '+1234567903'
    WHEN station_id = 'FS005' THEN '+1234567907'
    ELSE NULL
END
WHERE station_name LIKE '%Firefighter 1%';

UPDATE firefighters
SET station_phone = CASE 
    WHEN station_id = 'FS001' THEN '+1234567892'
    WHEN station_id = 'FS002' THEN '+1234567896'
    WHEN station_id = 'FS003' THEN '+1234567900'
    WHEN station_id = 'FS004' THEN '+1234567904'
    WHEN station_id = 'FS005' THEN '+1234567908'
    ELSE NULL
END
WHERE station_name LIKE '%Firefighter 2%';

UPDATE firefighters
SET station_phone = CASE 
    WHEN station_id = 'FS001' THEN '+1234567893'
    WHEN station_id = 'FS002' THEN '+1234567897'
    WHEN station_id = 'FS003' THEN '+1234567901'
    WHEN station_id = 'FS004' THEN '+1234567905'
    WHEN station_id = 'FS005' THEN '+1234567909'
    ELSE NULL
END
WHERE station_name LIKE '%Firefighter 3%'; 