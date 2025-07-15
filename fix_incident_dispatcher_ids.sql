-- =====================================================
-- FIX INCIDENTS: SET dispatcher_id TO UUID (dispatchers.id)
-- =====================================================
-- This script updates all incidents so that dispatcher_id is set to the UUID from dispatchers.id,
-- not the dispatcher_id text code. Only updates if dispatcher_id currently matches dispatcher.dispatcher_id
-- and does not already match dispatcher.id.
-- =====================================================

UPDATE incidents
SET dispatcher_id = d.id
FROM dispatchers d
WHERE incidents.dispatcher_id = d.dispatcher_id
  AND incidents.dispatcher_id <> d.id;

-- Verification: Show incidents with dispatcher_id as UUID and as text code
SELECT 
    i.id as incident_id,
    i.dispatcher_id,
    d.id as dispatcher_uuid,
    d.dispatcher_id as dispatcher_code,
    d.name as dispatcher_name
FROM incidents i
LEFT JOIN dispatchers d ON i.dispatcher_id = d.id
ORDER BY i.created_at DESC
LIMIT 20; 