-- Create incident_responses table
CREATE TABLE incident_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    firefighter_id UUID REFERENCES firefighters(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    response_time TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create firefighter_locations table for real-time tracking
CREATE TABLE firefighter_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firefighter_id UUID REFERENCES firefighters(id) ON DELETE CASCADE,
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create chat_messages table
CREATE TABLE chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create emergency_calls table
CREATE TABLE emergency_calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    caller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    station_id UUID REFERENCES firefighters(id) ON DELETE CASCADE,
    caller_location TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'received', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    received_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create call_signals table for WebRTC signaling
CREATE TABLE call_signals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id UUID REFERENCES emergency_calls(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('offer', 'answer', 'ice-candidate')),
    signal JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable Row Level Security
ALTER TABLE incident_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE firefighter_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY;

-- Create policies for incident_responses
CREATE POLICY "Users can view their incident responses"
    ON incident_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM incidents
            WHERE incidents.id = incident_responses.incident_id
            AND incidents.reported_by = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM firefighters
            WHERE firefighters.id = incident_responses.firefighter_id
            AND firefighters.id = auth.uid()
        )
    );

CREATE POLICY "Firefighters can update incident responses"
    ON incident_responses FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM firefighters
            WHERE firefighters.id = incident_responses.firefighter_id
            AND firefighters.id = auth.uid()
        )
    );

-- Create policies for firefighter_locations
CREATE POLICY "Users can view firefighter locations for their incidents"
    ON firefighter_locations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM incidents
            WHERE incidents.id = firefighter_locations.incident_id
            AND incidents.reported_by = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM firefighters
            WHERE firefighters.id = firefighter_locations.firefighter_id
            AND firefighters.id = auth.uid()
        )
    );

CREATE POLICY "Firefighters can update their locations"
    ON firefighter_locations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM firefighters
            WHERE firefighters.id = firefighter_locations.firefighter_id
            AND firefighters.id = auth.uid()
        )
    );

-- Create policies for chat_messages
CREATE POLICY "Users can view chat messages for their incidents"
    ON chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM incidents
            WHERE incidents.id = chat_messages.incident_id
            AND incidents.reported_by = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM firefighters
            WHERE firefighters.id = chat_messages.sender_id
            AND firefighters.id = auth.uid()
        )
    );

CREATE POLICY "Users can insert chat messages"
    ON chat_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM incidents
            WHERE incidents.id = chat_messages.incident_id
            AND incidents.reported_by = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM firefighters
            WHERE firefighters.id = chat_messages.sender_id
            AND firefighters.id = auth.uid()
        )
    );

-- Create policies for emergency_calls
CREATE POLICY "Users can view their emergency calls"
    ON emergency_calls FOR SELECT
    USING (
        caller_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM firefighters
            WHERE firefighters.id = emergency_calls.station_id
            AND firefighters.id = auth.uid()
        )
    );

CREATE POLICY "Users can create emergency calls"
    ON emergency_calls FOR INSERT
    WITH CHECK (caller_id = auth.uid());

CREATE POLICY "Firefighters can update emergency call status"
    ON emergency_calls FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM firefighters
            WHERE firefighters.id = emergency_calls.station_id
            AND firefighters.id = auth.uid()
        )
    );

-- Create policies for call_signals
CREATE POLICY "Users can view their call signals"
    ON call_signals FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM emergency_calls
            WHERE emergency_calls.id = call_signals.call_id
            AND (
                emergency_calls.caller_id = auth.uid() OR
                emergency_calls.station_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert call signals"
    ON call_signals FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM emergency_calls
            WHERE emergency_calls.id = call_signals.call_id
            AND (
                emergency_calls.caller_id = auth.uid() OR
                emergency_calls.station_id = auth.uid()
            )
        )
    );

-- Create function to find nearest fire station
CREATE OR REPLACE FUNCTION find_nearest_fire_station(
    incident_lat DOUBLE PRECISION,
    incident_lng DOUBLE PRECISION
)
RETURNS TABLE (
    station_id VARCHAR,
    station_location VARCHAR,
    distance DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.station_id,
        f.station_location,
        ST_Distance(
            ST_MakePoint(incident_lng, incident_lat)::geography,
            ST_MakePoint(
                CAST(SPLIT_PART(f.station_location, ',', 1) AS DOUBLE PRECISION),
                CAST(SPLIT_PART(f.station_location, ',', 2) AS DOUBLE PRECISION)
            )::geography
        ) as distance
    FROM firefighters f
    WHERE f.is_active = true
    ORDER BY distance
    LIMIT 1;
END;
$$ LANGUAGE plpgsql; 