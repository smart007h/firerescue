-- Step 1: Drop all RLS policies on chat_messages that reference sender_id
DROP POLICY IF EXISTS "Users can view their incident messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their incidents" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON chat_messages; 