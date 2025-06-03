-- Enable RLS
ALTER TABLE public.dispatchers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read dispatchers" ON public.dispatchers;
DROP POLICY IF EXISTS "Allow authenticated users to update dispatchers" ON public.dispatchers;
DROP POLICY IF EXISTS "Allow public to read dispatchers" ON public.dispatchers;

-- Create policies for dispatchers table
CREATE POLICY "Allow public to read dispatchers"
ON public.dispatchers FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow authenticated users to update dispatchers"
ON public.dispatchers FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- First, delete existing dispatchers and their auth users
DO $$
BEGIN
    -- Delete auth users first (due to foreign key constraints)
    DELETE FROM auth.users 
    WHERE email IN (
        SELECT email FROM public.dispatchers
    );
    
    -- Then delete all existing dispatchers
    DELETE FROM public.dispatchers;
END $$;

-- Now insert the new dispatcher records
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
    user_id uuid;
BEGIN
    FOR dispatcher_record IN SELECT * FROM public.dispatchers
    LOOP
        -- Generate a UUID for the user
        user_id := gen_random_uuid();

        -- Create the user in auth.users
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            aud,
            role,
            confirmation_token,
            email_change_token_current,
            email_change_token_new,
            recovery_token,
            phone,
            phone_confirmed_at,
            banned_until,
            confirmation_sent_at,
            email_change_sent_at,
            is_anonymous,
            is_sso_user,
            deleted_at
        )
        VALUES (
            user_id,
            '00000000-0000-0000-0000-000000000000',
            dispatcher_record.email,
            crypt(dispatcher_record.password, gen_salt('bf')),
            now(),
            now(),
            now(),
            jsonb_build_object(
                'provider', 'email',
                'providers', ARRAY['email']
            ),
            jsonb_build_object(
                'role', 'dispatcher',
                'station_id', dispatcher_record.station_id,
                'dispatcher_id', dispatcher_record.dispatcher_id
            ),
            'authenticated',
            'authenticated',
            '',
            '',
            '',
            '',
            dispatcher_record.phone,
            NULL,
            NULL,
            NULL,
            NULL,
            false,
            false,
            NULL
        );

        -- Create the user's identity
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            user_id,
            jsonb_build_object(
                'sub', user_id,
                'email', dispatcher_record.email
            ),
            'email',
            dispatcher_record.email,
            now(),
            now(),
            now()
        );
    END LOOP;
END $$; 