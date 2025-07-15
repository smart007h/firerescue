-- Migration: Add chat_message_reads table for chat message read tracking
CREATE TABLE IF NOT EXISTS chat_message_reads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE (message_id, user_id)
);

-- Optional: Index for faster unread queries
CREATE INDEX IF NOT EXISTS idx_chat_message_reads_user_message ON chat_message_reads(user_id, message_id); 