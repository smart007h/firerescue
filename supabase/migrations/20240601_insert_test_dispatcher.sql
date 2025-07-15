-- Add latitude, longitude, password, and region columns to dispatchers table if not exists
ALTER TABLE dispatchers
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS password TEXT,
ADD COLUMN IF NOT EXISTS region TEXT;

-- Insert a test dispatcher for station FS002
INSERT INTO dispatchers (id, dispatcher_id, name, phone, email, station_id, latitude, longitude, password, region)
VALUES (
  'FS002DISP01',      -- id
  'FS002DISP01',      -- dispatcher_id
  'John Doe',
  '+233201234567',
  'johndoe@example.com',
  'FS002',
  6.6835,             -- latitude
  -1.4239,            -- longitude
  'testpassword123',  -- password
  'Ashanti'           -- region
)
ON CONFLICT (id) DO NOTHING;

-- Insert or update dispatcher location for the test dispatcher
INSERT INTO dispatcher_locations (dispatcher_id, status, updated_at)
VALUES (
  'FS002DISP01',
  'available',
  NOW()
)
ON CONFLICT (dispatcher_id) DO UPDATE SET status = 'available', updated_at = NOW(); 