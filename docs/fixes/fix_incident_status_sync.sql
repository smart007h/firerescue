-- Script to synchronize incident statuses and ensure consistency between civilian and dispatcher views
-- Run this in your Supabase SQL editor

-- 1. First, let's see the current state of all incidents
SELECT 
  id,
  incident_type,
  status,
  dispatcher_id,
  reported_by,
  station_id,
  created_at,
  updated_at
FROM incidents
ORDER BY created_at DESC;

-- 2. Check for incidents with null or inconsistent statuses
SELECT 
  'Null Status' as issue_type,
  COUNT(*) as count
FROM incidents 
WHERE status IS NULL

UNION ALL

SELECT 
  'Missing Updated Timestamp' as issue_type,
  COUNT(*) as count
FROM incidents 
WHERE updated_at IS NULL

UNION ALL

SELECT 
  'Old In-Progress Incidents' as issue_type,
  COUNT(*) as count
FROM incidents 
WHERE status = 'in_progress' 
  AND created_at < (NOW() - INTERVAL '24 hours');

-- 3. Show Ama Osei's incidents specifically (as mentioned in the issue)
SELECT 
  id,
  incident_type,
  status,
  created_at,
  updated_at,
  CASE 
    WHEN status = 'resolved' THEN '✅ Resolved (Good)'
    WHEN status = 'in_progress' THEN '⚠️ Still In Progress'
    WHEN status = 'pending' THEN '🔄 Pending Assignment'
    ELSE '❓ Unknown Status'
  END as status_check
FROM incidents 
WHERE dispatcher_id = 'FS001'  -- Ama Osei's dispatcher ID
ORDER BY created_at DESC;

-- 4. Fix any incidents with null status (set to pending by default)
UPDATE incidents 
SET 
  status = 'pending',
  updated_at = NOW()
WHERE status IS NULL;

-- 5. Fix incidents missing updated_at timestamp
UPDATE incidents 
SET updated_at = created_at
WHERE updated_at IS NULL;

-- 6. For incidents assigned to Ama Osei that are very old and still in_progress,
-- you may want to resolve them. Uncomment the line below if you want to auto-resolve
-- incidents that have been in progress for more than 24 hours:

-- UPDATE incidents 
-- SET 
--   status = 'resolved',
--   updated_at = NOW()
-- WHERE dispatcher_id = 'FS001' 
--   AND status = 'in_progress' 
--   AND created_at < (NOW() - INTERVAL '24 hours');

-- 7. Check the final state after updates
SELECT 
  status,
  COUNT(*) as count,
  CASE 
    WHEN status = 'pending' THEN '🟡 Waiting for assignment'
    WHEN status = 'in_progress' THEN '🔵 Being handled'
    WHEN status = 'resolved' THEN '🟢 Completed'
    WHEN status = 'cancelled' THEN '⚫ Cancelled'
    ELSE '❓ Unknown'
  END as description
FROM incidents 
GROUP BY status
ORDER BY 
  CASE status
    WHEN 'pending' THEN 1
    WHEN 'in_progress' THEN 2
    WHEN 'resolved' THEN 3
    WHEN 'cancelled' THEN 4
    ELSE 5
  END;

-- 8. Show recent activity for debugging
SELECT 
  id,
  incident_type,
  status,
  dispatcher_id,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as created,
  TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI') as updated,
  CASE 
    WHEN dispatcher_id = 'FS001' THEN 'Ama Osei'
    WHEN dispatcher_id IS NULL THEN 'Unassigned'
    ELSE dispatcher_id
  END as assigned_to
FROM incidents 
WHERE created_at > (NOW() - INTERVAL '7 days')
ORDER BY created_at DESC;

-- 9. Create a function to ensure status consistency when incidents are updated
CREATE OR REPLACE FUNCTION ensure_incident_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure updated_at is always set when status changes
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.updated_at = NOW();
  END IF;
  
  -- If dispatcher is assigned and status is pending, move to in_progress
  IF NEW.dispatcher_id IS NOT NULL AND OLD.dispatcher_id IS NULL AND NEW.status = 'pending' THEN
    NEW.status = 'in_progress';
    NEW.updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger to maintain consistency
DROP TRIGGER IF EXISTS trigger_incident_consistency ON incidents;
CREATE TRIGGER trigger_incident_consistency
  BEFORE UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION ensure_incident_consistency();

-- 11. Add helpful comments for future reference
COMMENT ON FUNCTION ensure_incident_consistency() IS 'Ensures incident status remains consistent with dispatcher assignments and timestamps';
COMMENT ON TRIGGER trigger_incident_consistency ON incidents IS 'Automatically maintains incident status consistency';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Incident status synchronization complete!';
  RAISE NOTICE '🔄 Triggers created to maintain future consistency';
  RAISE NOTICE '📊 Check the results above to verify all statuses are correct';
  RAISE NOTICE '💡 Both civilian and dispatcher views should now show consistent statuses';
END $$;
