-- FIX: Add missing columns to buses table (unit_number and mechanical_notes)
-- Execute this SQL directly in your Supabase SQL Editor if migration 004 hasn't run

DO $$
BEGIN
    -- Add unit_number column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'buses' 
        AND column_name = 'unit_number'
    ) THEN
        ALTER TABLE buses ADD COLUMN unit_number TEXT;
        COMMENT ON COLUMN buses.unit_number IS 'Número de unidad del bus';
        RAISE NOTICE 'Column unit_number added successfully';
    ELSE
        RAISE NOTICE 'Column unit_number already exists';
    END IF;

    -- Add mechanical_notes column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'buses' 
        AND column_name = 'mechanical_notes'
    ) THEN
        ALTER TABLE buses ADD COLUMN mechanical_notes TEXT;
        COMMENT ON COLUMN buses.mechanical_notes IS 'Anotaciones mecánicas y mantenimiento del bus';
        RAISE NOTICE 'Column mechanical_notes added successfully';
    ELSE
        RAISE NOTICE 'Column mechanical_notes already exists';
    END IF;

    -- Add index on unit_number if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'buses' 
        AND indexname = 'idx_buses_unit_number'
    ) THEN
        CREATE INDEX idx_buses_unit_number ON buses(unit_number);
        RAISE NOTICE 'Index idx_buses_unit_number created successfully';
    ELSE
        RAISE NOTICE 'Index idx_buses_unit_number already exists';
    END IF;
END $$;

