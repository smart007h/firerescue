-- Fix the training_bookings and firefighters relationship
-- This migration addresses the PGRST200 error by ensuring proper foreign key relationships

-- First, handle dependencies and recreate the UNIQUE constraint on firefighters.station_id
-- Step 1: Drop dependent foreign key constraints first
ALTER TABLE call_logs DROP CONSTRAINT IF EXISTS call_logs_station_id_fkey;
ALTER TABLE training_bookings DROP CONSTRAINT IF EXISTS training_bookings_station_id_fkey;

-- Step 2: Drop the existing unique constraint
ALTER TABLE firefighters DROP CONSTRAINT IF EXISTS firefighters_station_id_key;

-- Step 3: Add the UNIQUE constraint on station_id with a clear name
ALTER TABLE firefighters ADD CONSTRAINT firefighters_station_id_unique UNIQUE (station_id);

-- Step 4: Recreate the call_logs foreign key constraint
ALTER TABLE call_logs 
    ADD CONSTRAINT call_logs_station_id_fkey 
    FOREIGN KEY (station_id) 
    REFERENCES firefighters(station_id);

-- Step 5: Add the training_bookings foreign key constraint
ALTER TABLE training_bookings 
    ADD CONSTRAINT training_bookings_station_id_fkey 
    FOREIGN KEY (station_id) 
    REFERENCES firefighters(station_id);

-- Step 6: Update the schema cache by running a quick query
-- This helps Supabase refresh its relationship cache
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND (tc.table_name='training_bookings' OR tc.table_name='call_logs')
    AND tc.table_schema='public';

-- Add comments for documentation
COMMENT ON CONSTRAINT training_bookings_station_id_fkey ON training_bookings 
IS 'Foreign key relationship to firefighters.station_id to enable Supabase joins';

COMMENT ON CONSTRAINT call_logs_station_id_fkey ON call_logs 
IS 'Foreign key relationship to firefighters.station_id (recreated during migration)';
