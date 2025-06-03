-- Update team members with Ghanaian details
UPDATE public.team_members
SET 
    name = 'Kwame Mensah',
    email = 'kwame.mensah@fs001.com',
    phone = '+233244123456',
    address = 'No. 12 Independence Avenue, Accra',
    region = 'Greater Accra'
WHERE station_id = 'FS001' AND role = 'team_leader';

UPDATE public.team_members
SET 
    name = 'Abena Osei',
    email = 'abena.osei@fs001.com',
    phone = '+233277234567',
    address = 'Plot 45 Airport Residential Area, Accra',
    region = 'Greater Accra'
WHERE station_id = 'FS001' AND role = 'firefighter' AND id = (SELECT id FROM public.team_members WHERE station_id = 'FS001' AND role = 'firefighter' LIMIT 1);

UPDATE public.team_members
SET 
    name = 'Kofi Addo',
    email = 'kofi.addo@fs001.com',
    phone = '+233209345678',
    address = 'House 23 Roman Ridge, Accra',
    region = 'Greater Accra'
WHERE station_id = 'FS001' AND role = 'firefighter' AND id = (SELECT id FROM public.team_members WHERE station_id = 'FS001' AND role = 'firefighter' LIMIT 1 OFFSET 1);

UPDATE public.team_members
SET 
    name = 'Efua Mensah',
    email = 'efua.mensah@fs001.com',
    phone = '+233244456789',
    address = 'Flat 3B Cantonments, Accra',
    region = 'Greater Accra'
WHERE station_id = 'FS001' AND role = 'firefighter' AND id = (SELECT id FROM public.team_members WHERE station_id = 'FS001' AND role = 'firefighter' LIMIT 1 OFFSET 2);

-- FS002 Team (Kumasi)
UPDATE public.team_members
SET 
    name = 'Yaw Owusu',
    email = 'yaw.owusu@fs002.com',
    phone = '+233277567890',
    address = 'Plot 78 Adum, Kumasi',
    region = 'Ashanti'
WHERE station_id = 'FS002' AND role = 'team_leader';

UPDATE public.team_members
SET 
    name = 'Akua Asante',
    email = 'akua.asante@fs002.com',
    phone = '+233244678901',
    address = 'No. 15 Bantama High Street, Kumasi',
    region = 'Ashanti'
WHERE station_id = 'FS002' AND role = 'firefighter' AND id = (SELECT id FROM public.team_members WHERE station_id = 'FS002' AND role = 'firefighter' LIMIT 1);

UPDATE public.team_members
SET 
    name = 'Kwabena Boateng',
    email = 'kwabena.boateng@fs002.com',
    phone = '+233209789012',
    address = 'House 34 Ahodwo, Kumasi',
    region = 'Ashanti'
WHERE station_id = 'FS002' AND role = 'firefighter' AND id = (SELECT id FROM public.team_members WHERE station_id = 'FS002' AND role = 'firefighter' LIMIT 1 OFFSET 1);

UPDATE public.team_members
SET 
    name = 'Adwoa Mensah',
    email = 'adwoa.mensah@fs002.com',
    phone = '+233277890123',
    address = 'Flat 5 Santasi, Kumasi',
    region = 'Ashanti'
WHERE station_id = 'FS002' AND role = 'firefighter' AND id = (SELECT id FROM public.team_members WHERE station_id = 'FS002' AND role = 'firefighter' LIMIT 1 OFFSET 2);

-- FS003 Team (Takoradi)
UPDATE public.team_members
SET 
    name = 'Kojo Sarpong',
    email = 'kojo.sarpong@fs003.com',
    phone = '+233244012345',
    address = 'No. 8 Market Circle, Takoradi',
    region = 'Western'
WHERE station_id = 'FS003' AND role = 'team_leader';

UPDATE public.team_members
SET 
    name = 'Ama Kufuor',
    email = 'ama.kufuor@fs003.com',
    phone = '+233277123456',
    address = 'Plot 12 Harbour Road, Takoradi',
    region = 'Western'
WHERE station_id = 'FS003' AND role = 'firefighter' AND id = (SELECT id FROM public.team_members WHERE station_id = 'FS003' AND role = 'firefighter' LIMIT 1);

UPDATE public.team_members
SET 
    name = 'Yaw Mensah',
    email = 'yaw.mensah@fs003.com',
    phone = '+233209234567',
    address = 'House 45 New Takoradi',
    region = 'Western'
WHERE station_id = 'FS003' AND role = 'firefighter' AND id = (SELECT id FROM public.team_members WHERE station_id = 'FS003' AND role = 'firefighter' LIMIT 1 OFFSET 1);

UPDATE public.team_members
SET 
    name = 'Efua Addo',
    email = 'efua.addo@fs003.com',
    phone = '+233244345678',
    address = 'Flat 2B Airport Ridge, Takoradi',
    region = 'Western'
WHERE station_id = 'FS003' AND role = 'firefighter' AND id = (SELECT id FROM public.team_members WHERE station_id = 'FS003' AND role = 'firefighter' LIMIT 1 OFFSET 2);

-- FS004 Team (Tamale)
UPDATE public.team_members
SET 
    name = 'Ibrahim Mohammed',
    email = 'ibrahim.mohammed@fs004.com',
    phone = '+233277456789',
    address = 'No. 15 Aboabo, Tamale',
    region = 'Northern'
WHERE station_id = 'FS004' AND role = 'team_leader';

UPDATE public.team_members
SET 
    name = 'Fatima Alhassan',
    email = 'fatima.alhassan@fs004.com',
    phone = '+233244567890',
    address = 'Plot 23 Sagnarigu, Tamale',
    region = 'Northern'
WHERE station_id = 'FS004' AND role = 'firefighter' AND id = (SELECT id FROM public.team_members WHERE station_id = 'FS004' AND role = 'firefighter' LIMIT 1);

UPDATE public.team_members
SET 
    name = 'Musah Abdulai',
    email = 'musah.abdulai@fs004.com',
    phone = '+233209678901',
    address = 'House 12 Lamashegu, Tamale',
    region = 'Northern'
WHERE station_id = 'FS004' AND role = 'firefighter' AND id = (SELECT id FROM public.team_members WHERE station_id = 'FS004' AND role = 'firefighter' LIMIT 1 OFFSET 1);

UPDATE public.team_members
SET 
    name = 'Aisha Mohammed',
    email = 'aisha.mohammed@fs004.com',
    phone = '+233277789012',
    address = 'Flat 4B Kalpohin, Tamale',
    region = 'Northern'
WHERE station_id = 'FS004' AND role = 'firefighter' AND id = (SELECT id FROM public.team_members WHERE station_id = 'FS004' AND role = 'firefighter' LIMIT 1 OFFSET 2);

-- FS005 Team (Cape Coast)
UPDATE public.team_members
SET 
    name = 'Kweku Ankomah',
    email = 'kweku.ankomah@fs005.com',
    phone = '+233244890123',
    address = 'No. 5 Victoria Road, Cape Coast',
    region = 'Central'
WHERE station_id = 'FS005' AND role = 'team_leader';

UPDATE public.team_members
SET 
    name = 'Abenaa Addo',
    email = 'abenaa.addo@fs005.com',
    phone = '+233277901234',
    address = 'Plot 67 Pedu Junction, Cape Coast',
    region = 'Central'
WHERE station_id = 'FS005' AND role = 'firefighter' AND id = (SELECT id FROM public.team_members WHERE station_id = 'FS005' AND role = 'firefighter' LIMIT 1);

UPDATE public.team_members
SET 
    name = 'Kwame Mensah',
    email = 'kwame.mensah@fs005.com',
    phone = '+233209012345',
    address = 'House 89 Abura, Cape Coast',
    region = 'Central'
WHERE station_id = 'FS005' AND role = 'firefighter' AND id = (SELECT id FROM public.team_members WHERE station_id = 'FS005' AND role = 'firefighter' LIMIT 1 OFFSET 1);

UPDATE public.team_members
SET 
    name = 'Efua Owusu',
    email = 'efua.owusu@fs005.com',
    phone = '+233244123456',
    address = 'Flat 3C Kotokuraba, Cape Coast',
    region = 'Central'
WHERE station_id = 'FS005' AND role = 'firefighter' AND id = (SELECT id FROM public.team_members WHERE station_id = 'FS005' AND role = 'firefighter' LIMIT 1 OFFSET 2); 