-- =====================================================
-- INSERT AMA OSEI - KUMASI STATION DISPATCHER (FS002)
-- =====================================================
-- This script inserts Ama Osei's dispatcher record into the dispatchers table
-- Run this in your Supabase SQL editor or database management tool
-- =====================================================

INSERT INTO dispatchers (
    id,
    station_id,
    dispatcher_id,
    name,
    email,
    phone,
    region,
    password,
    is_active,
    created_at,
    updated_at,
    latitude,
    longitude
) VALUES (
    '550e8400-e29b-41d4-a716-446655440002',  -- ID
    'FS002',                                  -- Station ID
    'FS002DISP01',                           -- Dispatcher ID
    'Ama Osei',                              -- Name
    'dispatch.kumasi@gmail.com',             -- Email
    '+233 20 234 5678',                      -- Phone
    'Ashanti Region',                        -- Region
    'FireStation102!',                       -- Password
    true,                                    -- Is Active
    NOW(),                                   -- Created At
    NOW(),                                   -- Updated At
    6.6885,                                  -- Latitude
    -1.6244                                  -- Longitude
)
ON CONFLICT (id) DO UPDATE SET
    station_id = EXCLUDED.station_id,
    dispatcher_id = EXCLUDED.dispatcher_id,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    region = EXCLUDED.region,
    password = EXCLUDED.password,
    is_active = EXCLUDED.is_active,
    updated_at = NOW(),
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these queries to verify the dispatcher was inserted successfully:

-- Check if Ama Osei exists in dispatchers table
SELECT 
    id,
    station_id,
    dispatcher_id,
    name,
    email,
    phone,
    region,
    is_active,
    latitude,
    longitude,
    created_at
FROM dispatchers 
WHERE email = 'dispatch.kumasi@gmail.com' 
   OR station_id = 'FS002'
   OR name = 'Ama Osei';

-- Count total dispatchers
SELECT COUNT(*) as total_dispatchers FROM dispatchers;

-- View all active dispatchers
SELECT 
    name,
    email,
    station_id,
    region,
    is_active
FROM dispatchers 
WHERE is_active = true
ORDER BY name; 