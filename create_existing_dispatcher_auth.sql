-- =====================================================
-- CREATE AUTH USER FOR EXISTING DISPATCHER
-- =====================================================
-- This script creates a Supabase Auth user for the existing dispatcher
-- Ama Osei from Kumasi (FS002) who was already in the system
-- =====================================================

-- First, let's check if the dispatcher exists in the dispatchers table
-- and get their current information
SELECT 
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
FROM dispatchers 
WHERE email = 'dispatch.kumasi@gmail.com' 
   OR station_id = 'FS002'
   OR name LIKE '%Ama%'
   OR name LIKE '%Osei%';

-- =====================================================
-- CREATE SUPABASE AUTH USER FOR AMA OSEI (KUMASI)
-- =====================================================
-- Run this Node.js script to create the auth user first:

/*
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agpxjkmubrrtkxfhjmjm.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFncHhqa211YnJydGt4ZmhqbWptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjMwNDEyMywiZXhwIjoyMDU3ODgwMTIzfQ.mZaThLJYeK-AbiOo6DigPcq2rnQChFv0rxF73OgmP2E';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createAmaOseiAuthUser() {
  console.log('Creating auth user for Ama Osei (Kumasi)...');
  
  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'dispatch.kumasi@gmail.com',
      password: 'FireStation102!',
      email_confirm: true,
      user_metadata: {
        name: 'Ama Osei',
        role: 'dispatcher',
        phone: '+233 20 234 5678'
      }
    });
    
    if (authError) {
      console.error('Error creating auth user:', authError.message);
      return;
    }
    
    const userId = authData.user.id;
    console.log(`✅ Created auth user with ID: ${userId}`);
    console.log('Use this UUID in the SQL UPDATE statement below');
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

createAmaOseiAuthUser();
*/

-- =====================================================
-- UPDATE EXISTING DISPATCHER WITH AUTH USER ID
-- =====================================================
-- After running the Node.js script above, replace 'REPLACE_WITH_ACTUAL_UUID'
-- with the actual UUID that was generated

-- Option 1: If Ama Osei already exists in dispatchers table, update her record
UPDATE dispatchers 
SET 
    id = 'REPLACE_WITH_ACTUAL_UUID',  -- Replace with actual UUID from Node.js script
    email = 'dispatch.kumasi@gmail.com',
    name = 'Ama Osei',
    phone = '+233 20 234 5678',
    station_id = 'FS002',
    dispatcher_id = 'FS002DISP01',
    region = 'Ashanti Region',
    password = 'FireStation102!',
    is_active = true,
    latitude = 6.6885,
    longitude = -1.6244,
    updated_at = NOW()
WHERE email = 'dispatch.kumasi@gmail.com' 
   OR station_id = 'FS002'
   OR name LIKE '%Ama%'
   OR name LIKE '%Osei%';

-- Option 2: If Ama Osei doesn't exist, insert a new record
-- (Uncomment and use this if the UPDATE above affects 0 rows)

/*
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
    'REPLACE_WITH_ACTUAL_UUID',  -- Replace with actual UUID from Node.js script
    'FS002',
    'FS002DISP01',
    'Ama Osei',
    'dispatch.kumasi@gmail.com',
    '+233 20 234 5678',
    'Ashanti Region',
    'FireStation102!',
    true,
    NOW(),
    NOW(),
    6.6885,
    -1.6244
);
*/

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

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
    created_at
FROM dispatchers 
WHERE email = 'dispatch.kumasi@gmail.com' 
   OR station_id = 'FS002'
   OR name LIKE '%Ama%'
   OR name LIKE '%Osei%';

-- Check if Ama Osei has a valid auth user
SELECT 
    d.id as dispatcher_id,
    d.name,
    d.email,
    d.station_id,
    d.region,
    CASE 
        WHEN au.id IS NOT NULL THEN 'Auth User Exists'
        ELSE 'NO AUTH USER - NEEDS FIXING'
    END as auth_status
FROM dispatchers d
LEFT JOIN auth.users au ON d.id = au.id
WHERE d.email = 'dispatch.kumasi@gmail.com' 
   OR d.station_id = 'FS002'
   OR d.name LIKE '%Ama%'
   OR d.name LIKE '%Osei%';

-- =====================================================
-- LOGIN CREDENTIALS FOR AMA OSEI
-- =====================================================
-- Email: dispatch.kumasi@gmail.com
-- Password: FireStation102!
-- Station: FS002 (Kumasi)
-- Region: Ashanti Region
-- Coordinates: 6.6885, -1.6244 