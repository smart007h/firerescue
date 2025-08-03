-- Add profile_image column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_image TEXT;
