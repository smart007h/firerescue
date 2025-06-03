-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read team members" ON public.team_members;
DROP POLICY IF EXISTS "Allow authenticated users to insert team members" ON public.team_members;
DROP POLICY IF EXISTS "Allow authenticated users to update team members" ON public.team_members;
DROP POLICY IF EXISTS "Allow authenticated users to delete team members" ON public.team_members;

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Create new policies with no authentication requirement
CREATE POLICY "Allow all users to read team members"
ON public.team_members FOR SELECT
USING (true);

CREATE POLICY "Allow all users to insert team members"
ON public.team_members FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow all users to update team members"
ON public.team_members FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all users to delete team members"
ON public.team_members FOR DELETE
USING (true);

-- Verify the policies
SELECT * FROM pg_policies WHERE tablename = 'team_members';

-- Verify the data exists
SELECT DISTINCT station_id, COUNT(*) as member_count 
FROM public.team_members 
GROUP BY station_id 
ORDER BY station_id; 