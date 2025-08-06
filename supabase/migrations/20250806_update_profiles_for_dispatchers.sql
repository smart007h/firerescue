-- Update profiles table to support dispatcher role

-- Add dispatcher role to the existing check constraint
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('user', 'firefighter', 'dispatcher'));

-- Create policy to allow dispatchers to view profiles (needed for chat)
CREATE POLICY "Dispatchers can view user profiles"
    ON profiles FOR SELECT
    USING (
        -- Allow if viewing own profile
        auth.uid() = id 
        OR 
        -- Allow if user is a dispatcher (for chat functionality)
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'dispatcher'
        )
    );

-- Update the handle_new_user function to support dispatcher role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET SEARCH_PATH = public
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', ''),
        COALESCE(new.raw_user_meta_data->>'phone', ''),
        COALESCE(new.raw_user_meta_data->>'role', 'user')  -- Allow role from metadata
    );
    RETURN new;
END;
$$;

-- Create function to create dispatcher auth users
CREATE OR REPLACE FUNCTION create_dispatcher_auth_user(
    dispatcher_email TEXT,
    dispatcher_password TEXT,
    dispatcher_name TEXT,
    dispatcher_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- This function would typically be called via Supabase Admin API
    -- For now, we'll just document the process
    RAISE NOTICE 'To create dispatcher auth user, use Supabase Admin API with email: %, name: %, dispatcher_id: %', 
                 dispatcher_email, dispatcher_name, dispatcher_id;
    
    -- Return a placeholder UUID
    RETURN gen_random_uuid();
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION create_dispatcher_auth_user IS 'Helper function to document dispatcher user creation process';
COMMENT ON CONSTRAINT profiles_role_check ON profiles IS 'Allows user, firefighter, and dispatcher roles';
