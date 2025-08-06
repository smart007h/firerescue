-- Fix missing columns in training_bookings table
-- This addresses the PGRST204 errors for missing 'company_name', 'num_participants', and 'training_time' columns

-- Check if the company_name column exists, and add it if it doesn't
DO $$ 
BEGIN
    -- Check if company_name column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'training_bookings' 
        AND column_name = 'company_name'
        AND table_schema = 'public'
    ) THEN
        -- Add the missing company_name column
        ALTER TABLE training_bookings 
        ADD COLUMN company_name TEXT;
        
        RAISE NOTICE 'Added missing company_name column to training_bookings table';
    ELSE
        RAISE NOTICE 'company_name column already exists in training_bookings table';
    END IF;
    
    -- Check if num_participants column exists, and add it if it doesn't
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'training_bookings' 
        AND column_name = 'num_participants'
        AND table_schema = 'public'
    ) THEN
        -- Add the missing num_participants column
        ALTER TABLE training_bookings 
        ADD COLUMN num_participants INTEGER NOT NULL DEFAULT 1 CHECK (num_participants > 0 AND num_participants <= 20);
        
        RAISE NOTICE 'Added missing num_participants column to training_bookings table';
    ELSE
        RAISE NOTICE 'num_participants column already exists in training_bookings table';
    END IF;
    
    -- Check if training_time column exists, and add it if it doesn't
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'training_bookings' 
        AND column_name = 'training_time'
        AND table_schema = 'public'
    ) THEN
        -- Add the missing training_time column
        ALTER TABLE training_bookings 
        ADD COLUMN training_time TIME NOT NULL DEFAULT '09:00:00';
        
        RAISE NOTICE 'Added missing training_time column to training_bookings table';
    ELSE
        RAISE NOTICE 'training_time column already exists in training_bookings table';
    END IF;
END $$;

-- Verify the complete table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'training_bookings' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Force refresh the schema cache by running a simple query
-- This helps Supabase recognize the column structure
SELECT COUNT(*) FROM training_bookings WHERE 1=0;

-- Add documentation for all columns
COMMENT ON COLUMN training_bookings.company_name 
IS 'Optional company or organization name for the training booking';

COMMENT ON COLUMN training_bookings.num_participants 
IS 'Number of participants for the training session (1-20)';

COMMENT ON COLUMN training_bookings.training_time 
IS 'Time of the training session';

-- Verify all columns now exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'training_bookings' 
        AND column_name = 'company_name'
        AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'company_name column still missing after migration';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'training_bookings' 
        AND column_name = 'num_participants'
        AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'num_participants column still missing after migration';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'training_bookings' 
        AND column_name = 'training_time'
        AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'training_time column still missing after migration';
    ELSE
        RAISE NOTICE 'Migration completed successfully - all required columns verified';
    END IF;
END $$;
