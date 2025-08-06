-- Final setup and data population for enhanced fire rescue system

-- Ensure all tables have proper relationships and data

-- 1. Update any existing incidents to have proper structure
UPDATE incidents 
SET 
  status = COALESCE(status, 'pending'),
  location_address = COALESCE(location_address, location)
WHERE location_address IS NULL AND location IS NOT NULL;

-- 2. Create sample test incident for development/testing
INSERT INTO incidents (
  id,
  incident_type,
  location,
  latitude,
  longitude,
  location_address,
  description,
  media_urls,
  status,
  reported_by,
  dispatcher_id,
  station_id
) VALUES (
  gen_random_uuid(),
  'Structure Fire',
  '5.6037, -0.1870',
  5.6037,
  -0.1870,
  'Independence Square, Accra, Ghana',
  'Large structure fire reported at commercial building. Multiple people trapped on upper floors.',
  '[]'::jsonb,
  'in_progress',
  (SELECT id FROM auth.users LIMIT 1), -- Use first available user
  'FS001',
  'STATION_001'
) ON CONFLICT DO NOTHING;

-- 3. Ensure dispatcher locations exist for all dispatchers
INSERT INTO dispatcher_locations (dispatcher_id, latitude, longitude)
SELECT 
  d.id,
  5.6037 + (RANDOM() - 0.5) * 0.1,  -- Random location near Accra
  -0.1870 + (RANDOM() - 0.5) * 0.1
FROM dispatchers d
WHERE NOT EXISTS (
  SELECT 1 FROM dispatcher_locations dl 
  WHERE dl.dispatcher_id = d.id
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_reported_by ON incidents(reported_by);

-- 5. Add helpful views for common queries
CREATE OR REPLACE VIEW incident_summary AS
SELECT 
  i.id,
  i.incident_type,
  i.location_address,
  i.status,
  i.created_at,
  i.reported_by,
  p_reporter.full_name as reporter_name,
  p_reporter.email as reporter_email,
  i.dispatcher_id,
  d.name as dispatcher_name,
  i.station_id,
  f.station_name,
  f.station_address
FROM incidents i
LEFT JOIN profiles p_reporter ON p_reporter.id = i.reported_by
LEFT JOIN dispatchers d ON d.id = i.dispatcher_id
LEFT JOIN firefighters f ON f.station_id = i.station_id
GROUP BY i.id, p_reporter.full_name, p_reporter.email, d.name, f.station_name, f.station_address;

-- 6. Create view for active dispatcher locations
CREATE OR REPLACE VIEW active_dispatcher_locations AS
SELECT 
  dl.dispatcher_id,
  dl.latitude,
  dl.longitude,
  dl.created_at as location_updated_at,
  d.name as dispatcher_name,
  d.station_id,
  f.station_name
FROM dispatcher_locations dl
JOIN dispatchers d ON d.id = dl.dispatcher_id
LEFT JOIN firefighters f ON f.station_id = d.station_id
WHERE d.is_active = true;

-- 7. Grant permissions on views
GRANT SELECT ON incident_summary TO authenticated;
GRANT SELECT ON active_dispatcher_locations TO authenticated;

-- 8. Add helpful functions
CREATE OR REPLACE FUNCTION get_incident_chat_participants(incident_uuid UUID)
RETURNS TABLE(user_id UUID, role TEXT, name TEXT, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.reported_by as user_id,
    'reporter'::text as role,
    p.full_name as name,
    p.email as email
  FROM incidents i
  JOIN profiles p ON p.id = i.reported_by
  WHERE i.id = incident_uuid
  
  UNION ALL
  
  SELECT 
    d.user_id,
    'dispatcher'::text as role,
    d.name,
    d.email
  FROM incidents i
  JOIN dispatchers d ON d.id = i.dispatcher_id
  WHERE i.id = incident_uuid AND d.user_id IS NOT NULL;
END;
$$;

-- 9. Create function to assign dispatcher to incident
CREATE OR REPLACE FUNCTION assign_dispatcher_to_incident(
  incident_uuid UUID,
  dispatcher_id_param TEXT,
  station_id_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE incidents 
  SET 
    dispatcher_id = dispatcher_id_param,
    station_id = COALESCE(station_id_param, (
      SELECT station_id FROM dispatchers WHERE id = dispatcher_id_param
    )),
    status = CASE WHEN status = 'pending' THEN 'in_progress' ELSE status END,
    updated_at = NOW()
  WHERE id = incident_uuid;
  
  RETURN FOUND;
END;
$$;

-- 10. Add final permissions
GRANT EXECUTE ON FUNCTION get_incident_chat_participants TO authenticated;
GRANT EXECUTE ON FUNCTION assign_dispatcher_to_incident TO authenticated;

-- Add final comments
COMMENT ON VIEW incident_summary IS 'Comprehensive view of incidents with related user and station information';
COMMENT ON VIEW active_dispatcher_locations IS 'Real-time locations of active dispatchers';
COMMENT ON FUNCTION get_incident_chat_participants IS 'Returns all users who can participate in an incident chat';
COMMENT ON FUNCTION assign_dispatcher_to_incident IS 'Assigns a dispatcher and station to an incident';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Fire Rescue database setup complete!';
  RAISE NOTICE '📊 Tables created: incidents, chat_messages, dispatchers, firefighters, dispatcher_locations';
  RAISE NOTICE '🔒 Row Level Security policies configured';
  RAISE NOTICE '📈 Performance indexes created';
  RAISE NOTICE '👥 Sample data populated';
  RAISE NOTICE '🚒 Ready for Fire Rescue operations!';
END $$;
