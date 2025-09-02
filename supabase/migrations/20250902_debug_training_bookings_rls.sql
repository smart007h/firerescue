-- Debug RLS issues for training_bookings table
-- This migration adds debugging and creates a more permissive policy for testing

-- First, let's check current policies
DO $$ 
BEGIN
    RAISE NOTICE 'Current RLS policies for training_bookings:';
END $$;

-- Add a debug policy that allows firefighters to update ANY booking (for testing)
DROP POLICY IF EXISTS "DEBUG: Firefighters can update any booking" ON training_bookings;

CREATE POLICY "DEBUG: Firefighters can update any booking"
    ON training_bookings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM firefighters
            WHERE firefighters.id::UUID = auth.uid()::UUID
        )
    );

-- Add logging function to debug RLS issues
CREATE OR REPLACE FUNCTION debug_training_booking_access(booking_id UUID)
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    firefighter_exists BOOLEAN,
    firefighter_station_id TEXT,
    booking_station_id TEXT,
    station_match BOOLEAN,
    can_read BOOLEAN,
    can_update BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    firefighter_rec RECORD;
    booking_rec RECORD;
BEGIN
    -- Get current user info
    SELECT u.id, u.email INTO user_id, user_email
    FROM auth.users u WHERE u.id = current_user_id;
    
    -- Check if user is a firefighter
    SELECT f.id, f.station_id INTO firefighter_rec
    FROM firefighters f WHERE f.id = current_user_id;
    
    firefighter_exists := firefighter_rec.id IS NOT NULL;
    firefighter_station_id := firefighter_rec.station_id;
    
    -- Get booking info
    SELECT tb.station_id INTO booking_rec
    FROM training_bookings tb WHERE tb.id = booking_id;
    
    booking_station_id := booking_rec.station_id;
    station_match := firefighter_station_id = booking_station_id;
    
    -- Test read access
    can_read := EXISTS (
        SELECT 1 FROM training_bookings tb
        WHERE tb.id = booking_id
    );
    
    -- Test update access (simplified)
    can_update := firefighter_exists;
    
    RETURN NEXT;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION debug_training_booking_access(UUID) TO authenticated;

-- Comment
COMMENT ON POLICY "DEBUG: Firefighters can update any booking" ON training_bookings 
IS 'TEMPORARY DEBUG POLICY: Allows any firefighter to update any booking for testing RLS issues';

COMMENT ON FUNCTION debug_training_booking_access(UUID) 
IS 'Debug function to check RLS access for training bookings';
