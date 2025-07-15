-- Change id in dispatchers to TEXT
ALTER TABLE dispatchers
ALTER COLUMN id TYPE TEXT;

-- Change dispatcher_id in dispatcher_locations to TEXT
ALTER TABLE dispatcher_locations
ALTER COLUMN dispatcher_id TYPE TEXT;

-- Change dispatcher_id in team_members to TEXT
ALTER TABLE team_members
ALTER COLUMN dispatcher_id TYPE TEXT;

-- Drop and recreate the foreign key constraint for team_members.dispatcher_id
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_dispatcher_id_fkey;
ALTER TABLE team_members
ADD CONSTRAINT team_members_dispatcher_id_fkey FOREIGN KEY (dispatcher_id) REFERENCES dispatchers(id); 