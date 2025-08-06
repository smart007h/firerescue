-- Migration: Fix chat_messages sender_id constraint to reference auth.users instead of profiles

-- Drop the problematic foreign key constraint that references profiles
ALTER TABLE chat_messages 
DROP CONSTRAINT IF EXISTS fk_chat_messages_sender_profiles;

-- Drop the old constraint if it exists
ALTER TABLE chat_messages 
DROP CONSTRAINT IF EXISTS fk_chat_messages_sender;

-- Add the correct foreign key constraint to auth.users
ALTER TABLE chat_messages
ADD CONSTRAINT fk_chat_messages_sender
FOREIGN KEY (sender_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Ensure sender_id column is uuid type
ALTER TABLE chat_messages
ALTER COLUMN sender_id TYPE uuid USING sender_id::uuid;
