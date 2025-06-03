-- Create incidents table
CREATE TABLE IF NOT EXISTS incidents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    incident_type TEXT NOT NULL,
    location TEXT NOT NULL,
    coordinates JSONB,
    description TEXT NOT NULL,
    media_urls JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'cancelled')),
    reported_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own incidents"
    ON incidents FOR INSERT
    WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can view their own incidents"
    ON incidents FOR SELECT
    USING (auth.uid() = reported_by);

CREATE POLICY "Users can update their own incidents"
    ON incidents FOR UPDATE
    USING (auth.uid() = reported_by);

CREATE POLICY "Users can delete their own incidents"
    ON incidents FOR DELETE
    USING (auth.uid() = reported_by);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_incidents_updated_at
    BEFORE UPDATE ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON incidents TO authenticated;
GRANT ALL ON incidents TO service_role; 