-- Enable RLS on emergency_calls table
ALTER TABLE emergency_calls ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to insert their own emergency calls
CREATE POLICY "Users can insert their own emergency calls"
    ON emergency_calls
    FOR INSERT
    WITH CHECK (auth.uid() = caller_id);

-- Create policy to allow users to view their own emergency calls
CREATE POLICY "Users can view their own emergency calls"
    ON emergency_calls
    FOR SELECT
    USING (auth.uid() = caller_id);

-- Create policy to allow firefighters to view emergency calls for their station
CREATE POLICY "Firefighters can view emergency calls for their station"
    ON emergency_calls
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM firefighters
            WHERE firefighters.station_id = emergency_calls.station_id
            AND firefighters.user_id = auth.uid()
        )
    ); 