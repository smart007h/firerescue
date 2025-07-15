-- =====================================================
-- TEST DISPATCHER CHAT AUTHENTICATION
-- =====================================================
-- This script helps debug the chat authentication issue
-- =====================================================

-- 1. Check if Ama Osei dispatcher exists
SELECT 
    id,
    station_id,
    dispatcher_id,
    name,
    email,
    is_active
FROM dispatchers 
WHERE email = 'dispatch.kumasi@gmail.com';

-- 2. Check if there are any incidents assigned to dispatchers
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
WHERE i.dispatcher_id IS NOT NULL
ORDER BY i.created_at DESC
LIMIT 10;

-- 3. Check if there are any incidents without dispatcher assignment
SELECT 
    id as incident_id,
    reported_by,
    dispatcher_id,
    status,
    created_at
FROM incidents 
WHERE dispatcher_id IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check total count of incidents
SELECT 
    COUNT(*) as total_incidents,
    COUNT(dispatcher_id) as incidents_with_dispatcher,
    COUNT(*) - COUNT(dispatcher_id) as incidents_without_dispatcher
FROM incidents;

-- 5. Check if there are any auth users for dispatchers
SELECT 
    au.id as auth_user_id,
    au.email,
    au.raw_user_meta_data,
    d.id as dispatcher_id,
    d.name as dispatcher_name
FROM auth.users au
LEFT JOIN dispatchers d ON au.email = d.email
WHERE au.email LIKE '%dispatch%'
   OR au.email LIKE '%kumasi%';

-- 6. Test RLS policies for chat_messages
-- This will show if the current user can access chat messages
-- (Run this after logging in as a dispatcher)
SELECT 
    cm.id,
    cm.incident_id,
    cm.sender_id,
    cm.message,
    cm.created_at,
    i.reported_by,
    i.dispatcher_id
FROM chat_messages cm
JOIN incidents i ON cm.incident_id = i.id
WHERE i.dispatcher_id = auth.uid()
   OR i.reported_by = auth.uid()
LIMIT 5; 