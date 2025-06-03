-- Create team_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    station_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    region TEXT NOT NULL DEFAULT 'Greater Accra',
    role TEXT NOT NULL DEFAULT 'firefighter',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read team members" ON public.team_members;
DROP POLICY IF EXISTS "Allow authenticated users to insert team members" ON public.team_members;
DROP POLICY IF EXISTS "Allow authenticated users to update team members" ON public.team_members;
DROP POLICY IF EXISTS "Allow authenticated users to delete team members" ON public.team_members;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to read team members"
ON public.team_members FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert team members"
ON public.team_members FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update team members"
ON public.team_members FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete team members"
ON public.team_members FOR DELETE
TO authenticated
USING (true);

-- Delete existing team members for FS001 to avoid duplicates
DELETE FROM public.team_members WHERE station_id = 'FS001';

-- Insert initial team members for FS001
INSERT INTO public.team_members (
    station_id,
    name,
    email,
    phone,
    address,
    region,
    role,
    is_active
) VALUES 
    (
        'FS001',
        'Kwame Mensah',
        'kwame.mensah@fire.gov.gh',
        '+233 24 123 4567',
        '123 Independence Ave, Accra',
        'Greater Accra',
        'team_leader',
        true
    ),
    (
        'FS001',
        'Abena Osei',
        'abena.osei@fire.gov.gh',
        '+233 27 234 5678',
        '456 Liberation Road, Accra',
        'Greater Accra',
        'firefighter',
        true
    ),
    (
        'FS001',
        'Kofi Addo',
        'kofi.addo@fire.gov.gh',
        '+233 20 345 6789',
        '789 Freedom Street, Accra',
        'Greater Accra',
        'firefighter',
        true
    ),
    (
        'FS001',
        'Efua Mensah',
        'efua.mensah@fire.gov.gh',
        '+233 54 456 7890',
        '321 Democracy Circle, Accra',
        'Greater Accra',
        'firefighter',
        true
    ),
    (
        'FS001',
        'Yaw Boateng',
        'yaw.boateng@fire.gov.gh',
        '+233 50 567 8901',
        '654 Republic Avenue, Accra',
        'Greater Accra',
        'firefighter',
        true
    ); 