-- Migration: Ensure chat_messages RLS policies for incident participants

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Incident participants can view chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Incident participants can insert chat messages" ON chat_messages;

-- Create policy: Incident participants can view chat messages
CREATE POLICY "Incident participants can view chat messages"
ON chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM incidents
    WHERE incidents.id = chat_messages.incident_id
    AND (
      incidents.reported_by = auth.uid()
      OR incidents.dispatcher_id = auth.uid()
    )
  )
);

-- Create policy: Incident participants can insert chat messages
CREATE POLICY "Incident participants can insert chat messages"
ON chat_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM incidents
    WHERE incidents.id = chat_messages.incident_id
    AND (
      incidents.reported_by = auth.uid()
      OR incidents.dispatcher_id = auth.uid()
    )
  )
); 