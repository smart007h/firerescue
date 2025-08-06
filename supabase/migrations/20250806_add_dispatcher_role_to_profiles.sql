-- Migration: Add 'dispatcher' to profiles role check constraint

-- Drop the existing check constraint
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add the new constraint that includes 'dispatcher'
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('user', 'firefighter', 'dispatcher'));
