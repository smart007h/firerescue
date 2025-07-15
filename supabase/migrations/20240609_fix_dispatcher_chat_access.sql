-- Migration: Ensure chat access and correct dispatcher assignment

-- (Constraint already exists, so this is commented out)
-- ALTER TABLE chat_messages
-- ADD CONSTRAINT fk_chat_messages_sender_profiles
-- FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Drop old chat_messages RLS policies
DROP POLICY IF EXISTS "Users can view chat messages for their incidents" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert chat messages" ON chat_messages;

-- Drop new policies if they already exist (for idempotency)
DROP POLICY IF EXISTS "Incident participants can view chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Incident participants can insert chat messages" ON chat_messages;

-- New: Allow incident reporter and assigned dispatcher to read/write chat messages
CREATE POLICY "Incident participants can view chat messages"
ON chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM incidents
    WHERE incidents.id = chat_messages.incident_id
    AND (
      incidents.reported_by = auth.uid()
      OR incidents.dispatcher_id = auth.uid()
      -- OR EXISTS (
      --   SELECT 1 FROM incident_responses
      --   WHERE incident_responses.incident_id = incidents.id
      --   AND incident_responses.firefighter_id = auth.uid()
      -- )
    )
  )
);

CREATE POLICY "Incident participants can insert chat messages"
ON chat_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM incidents
    WHERE incidents.id = chat_messages.incident_id
    AND (
      incidents.reported_by = auth.uid()
      OR incidents.dispatcher_id = auth.uid()
      -- OR EXISTS (
      --   SELECT 1 FROM incident_responses
      --   WHERE incident_responses.incident_id = incidents.id
      --   AND incident_responses.firefighter_id = auth.uid()
      -- )
    )
  )
);

-- One-time fix: Update dispatcher records to use the correct UUID
UPDATE dispatchers
SET id = u.id
FROM auth.users u
WHERE dispatchers.email = u.email
  AND dispatchers.id <> u.id;

-- One-time fix: Update incidents to use the correct dispatcher UUID
UPDATE incidents
SET dispatcher_id = d.id
FROM dispatchers d
WHERE incidents.dispatcher_id::text = d.dispatcher_id
  AND incidents.dispatcher_id::uuid <> d.id; 