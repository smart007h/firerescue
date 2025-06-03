-- Create dispatchers table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.dispatchers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    station_id TEXT NOT NULL,
    dispatcher_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    region TEXT NOT NULL,
    password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT fk_station
        FOREIGN KEY (station_id) 
        REFERENCES firefighters(station_id)
        ON DELETE CASCADE
);

-- Drop existing table if it exists to ensure clean creation
DROP TABLE IF EXISTS public.dispatchers CASCADE;

-- Create dispatchers table
CREATE TABLE public.dispatchers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    station_id TEXT NOT NULL,
    dispatcher_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    region TEXT NOT NULL,
    password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT fk_station
        FOREIGN KEY (station_id) 
        REFERENCES firefighters(station_id)
        ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.dispatchers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to read dispatchers"
ON public.dispatchers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to update dispatchers"
ON public.dispatchers FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Insert dispatcher details for stations FS001 to FS010
INSERT INTO public.dispatchers (station_id, dispatcher_id, name, email, phone, region, password)
VALUES 
    -- Greater Accra Region
    ('FS001', 'FS001DISP01', 'Dispatcher 1', 'dispatch.accracentral@fireservice.com', '+233244111001', 'Greater Accra Region', 'AccraCentralFS001Disp#2024'),
    
    -- Ashanti Region
    ('FS002', 'FS002DISP01', 'Dispatcher 1', 'dispatch.kumasicentral@fireservice.com', '+233244111002', 'Ashanti Region', 'KumasiCentralFS002Disp#2024'),
    
    -- Western Region
    ('FS003', 'FS003DISP01', 'Dispatcher 1', 'dispatch.takoradi@fireservice.com', '+233244111003', 'Western Region', 'TakoradiFS003Disp#2024'),
    
    -- Northern Region
    ('FS004', 'FS004DISP01', 'Dispatcher 1', 'dispatch.tamale@fireservice.com', '+233244111004', 'Northern Region', 'TamaleFS004Disp#2024'),
    
    -- Greater Accra Region
    ('FS005', 'FS005DISP01', 'Dispatcher 1', 'dispatch.tema@fireservice.com', '+233244111005', 'Greater Accra Region', 'TemaFS005Disp#2024'),
    
    -- Central Region
    ('FS006', 'FS006DISP01', 'Dispatcher 1', 'dispatch.capecoast@fireservice.com', '+233244111006', 'Central Region', 'CapeCoastFS006Disp#2024'),
    
    -- Eastern Region
    ('FS007', 'FS007DISP01', 'Dispatcher 1', 'dispatch.koforidua@fireservice.com', '+233244111007', 'Eastern Region', 'KoforiduaFS007Disp#2024'),
    
    -- Bono Region
    ('FS008', 'FS008DISP01', 'Dispatcher 1', 'dispatch.sunyani@fireservice.com', '+233244111008', 'Bono Region', 'SunyaniFS008Disp#2024'),
    
    -- Volta Region
    ('FS009', 'FS009DISP01', 'Dispatcher 1', 'dispatch.ho@fireservice.com', '+233244111009', 'Volta Region', 'HoFS009Disp#2024'),
    
    -- Upper East Region
    ('FS010', 'FS010DISP01', 'Dispatcher 1', 'dispatch.bolgatanga@fireservice.com', '+233244111010', 'Upper East Region', 'BolgatangaFS010Disp#2024');

-- Create auth accounts for dispatchers
DO $$
DECLARE
    dispatcher_record RECORD;
BEGIN
    FOR dispatcher_record IN SELECT email, password FROM public.dispatchers
    LOOP
        -- Check if user already exists
        IF NOT EXISTS (
            SELECT 1 FROM auth.users WHERE email = dispatcher_record.email
        ) THEN
            INSERT INTO auth.users (
                id,
                instance_id,
                email,
                encrypted_password,
                email_confirmed_at,
                role,
                raw_app_meta_data,
                raw_user_meta_data,
                is_super_admin,
                is_sso_user,
                deleted_at
            )
            VALUES (
                gen_random_uuid(),
                '00000000-0000-0000-0000-000000000000',
                dispatcher_record.email,
                crypt(dispatcher_record.password, gen_salt('bf')),
                NOW(),
                'dispatcher',
                '{"provider":"email","providers":["email"]}',
                '{}',
                false,
                false,
                NULL
            );
        END IF;
    END LOOP;
END $$; 