-- Create team_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    station_id VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    region VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read team members
CREATE POLICY "Allow authenticated users to read team members"
ON public.team_members FOR SELECT
TO authenticated
USING (true);

-- Insert initial team members
INSERT INTO public.team_members (station_id, name, email, phone, address, region, role)
VALUES 
-- FS001 Team (Accra)
('FS001', 'Kwame Mensah', 'kwame.mensah@fs001.com', '+233244123456', 'No. 12 Independence Avenue, Accra', 'Greater Accra', 'team_leader'),
('FS001', 'Abena Osei', 'abena.osei@fs001.com', '+233277234567', 'Plot 45 Airport Residential Area, Accra', 'Greater Accra', 'firefighter'),
('FS001', 'Kofi Addo', 'kofi.addo@fs001.com', '+233209345678', 'House 23 Roman Ridge, Accra', 'Greater Accra', 'firefighter'),
('FS001', 'Efua Mensah', 'efua.mensah@fs001.com', '+233244456789', 'Flat 3B Cantonments, Accra', 'Greater Accra', 'firefighter'),

-- FS002 Team (Kumasi)
('FS002', 'Yaw Owusu', 'yaw.owusu@fs002.com', '+233277567890', 'Plot 78 Adum, Kumasi', 'Ashanti', 'team_leader'),
('FS002', 'Akua Asante', 'akua.asante@fs002.com', '+233244678901', 'No. 15 Bantama High Street, Kumasi', 'Ashanti', 'firefighter'),
('FS002', 'Kwabena Boateng', 'kwabena.boateng@fs002.com', '+233209789012', 'House 34 Ahodwo, Kumasi', 'Ashanti', 'firefighter'),
('FS002', 'Adwoa Mensah', 'adwoa.mensah@fs002.com', '+233277890123', 'Flat 5 Santasi, Kumasi', 'Ashanti', 'firefighter'),

-- FS003 Team (Takoradi)
('FS003', 'Kojo Sarpong', 'kojo.sarpong@fs003.com', '+233244012345', 'No. 8 Market Circle, Takoradi', 'Western', 'team_leader'),
('FS003', 'Ama Kufuor', 'ama.kufuor@fs003.com', '+233277123456', 'Plot 12 Harbour Road, Takoradi', 'Western', 'firefighter'),
('FS003', 'Yaw Mensah', 'yaw.mensah@fs003.com', '+233209234567', 'House 45 New Takoradi', 'Western', 'firefighter'),
('FS003', 'Efua Addo', 'efua.addo@fs003.com', '+233244345678', 'Flat 2B Airport Ridge, Takoradi', 'Western', 'firefighter'),

-- FS004 Team (Tamale)
('FS004', 'Ibrahim Mohammed', 'ibrahim.mohammed@fs004.com', '+233277456789', 'No. 15 Aboabo, Tamale', 'Northern', 'team_leader'),
('FS004', 'Fatima Alhassan', 'fatima.alhassan@fs004.com', '+233244567890', 'Plot 23 Sagnarigu, Tamale', 'Northern', 'firefighter'),
('FS004', 'Musah Abdulai', 'musah.abdulai@fs004.com', '+233209678901', 'House 12 Lamashegu, Tamale', 'Northern', 'firefighter'),
('FS004', 'Aisha Mohammed', 'aisha.mohammed@fs004.com', '+233277789012', 'Flat 4B Kalpohin, Tamale', 'Northern', 'firefighter'),

-- FS005 Team (Cape Coast)
('FS005', 'Kweku Ankomah', 'kweku.ankomah@fs005.com', '+233244890123', 'No. 5 Victoria Road, Cape Coast', 'Central', 'team_leader'),
('FS005', 'Abenaa Addo', 'abenaa.addo@fs005.com', '+233277901234', 'Plot 67 Pedu Junction, Cape Coast', 'Central', 'firefighter'),
('FS005', 'Kwame Mensah', 'kwame.mensah@fs005.com', '+233209012345', 'House 89 Abura, Cape Coast', 'Central', 'firefighter'),
('FS005', 'Efua Owusu', 'efua.owusu@fs005.com', '+233244123456', 'Flat 3C Kotokuraba, Cape Coast', 'Central', 'firefighter'); 