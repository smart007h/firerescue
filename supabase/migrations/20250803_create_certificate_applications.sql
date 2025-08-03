-- Create certificate_applications table
CREATE TABLE certificate_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    applicant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    applicant_name TEXT NOT NULL,
    premises_address TEXT NOT NULL,
    premises_location TEXT NOT NULL,
    use_of_premises TEXT NOT NULL,
    number_of_storeys INTEGER NOT NULL,
    floors JSONB NOT NULL, -- Store floor details as JSON
    review_fee DECIMAL(10,2) NOT NULL,
    final_cost DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable Row Level Security
ALTER TABLE certificate_applications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own applications"
    ON certificate_applications FOR SELECT
    USING (applicant_id = auth.uid());

CREATE POLICY "Users can insert their own applications"
    ON certificate_applications FOR INSERT
    WITH CHECK (applicant_id = auth.uid());

CREATE POLICY "Users can update their own applications"
    ON certificate_applications FOR UPDATE
    USING (applicant_id = auth.uid())
    WITH CHECK (applicant_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_certificate_applications_applicant_id ON certificate_applications(applicant_id);
CREATE INDEX idx_certificate_applications_status ON certificate_applications(status);
CREATE INDEX idx_certificate_applications_created_at ON certificate_applications(created_at);
