-- =====================================================
-- ASSIGN TEST INCIDENT TO AMA OSEI DISPATCHER
-- =====================================================
-- This script assigns a test incident to Ama Osei for testing chat functionality
-- =====================================================

-- First, get Ama Osei's dispatcher ID
WITH ama_osei AS (
    SELECT id, name, email
    FROM dispatchers 
    WHERE email = 'dispatch.kumasi@gmail.com'
    LIMIT 1
)

-- Update the most recent incident to assign it to Ama Osei
UPDATE incidents 
SET 
    dispatcher_id = (SELECT id FROM ama_osei),
    updated_at = NOW()
WHERE id = (
    SELECT id 
    FROM incidents 
    WHERE dispatcher_id IS NULL 
    ORDER BY created_at DESC 
    LIMIT 1
);

-- Verify the assignment
SELECT 
    i.id as incident_id,
    i.reported_by,
    i.dispatcher_id,
    i.status,
    i.created_at,
    d.name as dispatcher_name,
    d.email as dispatcher_email
FROM incidents i
LEFT JOIN dispatchers d ON i.dispatcher_id = d.id
WHERE i.dispatcher_id = (
    SELECT id 
    FROM dispatchers 
    WHERE email = 'dispatch.kumasi@gmail.com'
)
ORDER BY i.created_at DESC
LIMIT 5;

-- =====================================================
-- ALTERNATIVE: Create a new test incident for Ama Osei
-- =====================================================
-- Uncomment the following if you want to create a new test incident

/*
INSERT INTO incidents (
    id,
    reported_by,
    incident_type,
    description,
    location,
    latitude,
    longitude,
    status,
    priority,
    dispatcher_id,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM profiles LIMIT 1), -- Use first available user as reporter
    'fire',
    'Test incident for dispatcher chat functionality',
    'Test Location, Kumasi',
    6.6885,
    -1.6244,
    'pending',
    'high',
    (SELECT id FROM dispatchers WHERE email = 'dispatch.kumasi@gmail.com'),
    NOW(),
    NOW()
);
*/ 