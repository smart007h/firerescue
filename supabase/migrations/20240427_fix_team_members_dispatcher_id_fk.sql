-- Migration: Fix team_members.dispatcher_id foreign key to reference dispatchers.dispatcher_id (text)

-- 1. Change dispatcher_id column in team_members to text (if not already)
ALTER TABLE team_members
ALTER COLUMN dispatcher_id TYPE text USING dispatcher_id::text;

-- 2. Drop the old foreign key constraint (if it exists)
ALTER TABLE team_members
DROP CONSTRAINT IF EXISTS team_members_dispatcher_id_fkey;

-- 3. Add the new foreign key constraint referencing dispatchers.dispatcher_id
ALTER TABLE team_members
ADD CONSTRAINT team_members_dispatcher_id_fkey
FOREIGN KEY (dispatcher_id)
REFERENCES dispatchers(dispatcher_id)
ON DELETE SET NULL; 