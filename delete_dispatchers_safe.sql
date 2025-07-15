-- =====================================================
-- SAFE DISPATCHER DELETION SCRIPT
-- =====================================================
-- This script safely deletes all dispatchers by first removing
-- dependent records that have foreign key constraints.
-- 
-- WHY THIS IS NEEDED:
-- - The dispatchers table has foreign key relationships with:
--   1. team_members table (dispatcher_id foreign key)
--   2. incidents table (dispatcher_id foreign key)
--   3. dispatcher_locations table (dispatcher_id foreign key)
-- - We must delete dependent records first to avoid constraint violations
-- =====================================================

-- STEP 1: Delete team member relationships
-- This removes all team_members records that reference dispatchers
-- This is necessary because team_members has a foreign key to dispatchers
DELETE FROM team_members 
WHERE dispatcher_id IS NOT NULL;

-- STEP 2: Delete incident assignments to dispatchers  
-- This removes all incidents that were assigned to dispatchers
-- This is necessary because incidents has a foreign key to dispatchers
-- WARNING: This will permanently delete all incidents assigned to dispatchers
-- If you want to preserve incidents, use UPDATE instead:
-- UPDATE incidents SET dispatcher_id = NULL WHERE dispatcher_id IS NOT NULL;
DELETE FROM incidents 
WHERE dispatcher_id IS NOT NULL;

-- STEP 3: Delete dispatcher location records
-- This removes all dispatcher_locations records that reference dispatchers
-- This is necessary because dispatcher_locations has a foreign key to dispatchers
DELETE FROM dispatcher_locations 
WHERE dispatcher_id IS NOT NULL;

-- STEP 4: Delete dispatchers (now safe)
-- After removing all dependent records, we can safely delete dispatchers
-- This will delete ALL dispatchers from the table
DELETE FROM dispatchers;

-- =====================================================
-- OPTIONAL: Reset auto-increment sequence (if applicable)
-- =====================================================
-- If your dispatchers table uses an auto-incrementing ID column,
-- uncomment the line below to reset the sequence counter:
-- ALTER SEQUENCE dispatchers_id_seq RESTART WITH 1;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these queries after executing the deletion script to verify
-- that all dispatchers and their dependent records have been removed:

-- Check if any team_members still reference dispatchers (should return 0)
-- SELECT COUNT(*) FROM team_members WHERE dispatcher_id IS NOT NULL;

-- Check if any incidents still reference dispatchers (should return 0)  
-- SELECT COUNT(*) FROM incidents WHERE dispatcher_id IS NOT NULL;

-- Check if any dispatcher_locations still reference dispatchers (should return 0)
-- SELECT COUNT(*) FROM dispatcher_locations WHERE dispatcher_id IS NOT NULL;

-- Check if any dispatchers remain (should return 0)
-- SELECT COUNT(*) FROM dispatchers;

-- =====================================================
-- ALTERNATIVE: Preserve incidents instead of deleting them
-- =====================================================
-- If you want to keep incident data but remove dispatcher assignments,
-- replace STEP 2 with this UPDATE statement instead:
-- UPDATE incidents SET dispatcher_id = NULL WHERE dispatcher_id IS NOT NULL;
-- This will keep all incidents but remove their dispatcher assignments 