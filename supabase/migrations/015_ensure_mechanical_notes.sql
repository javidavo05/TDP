-- Ensure mechanical_notes column exists in buses table
-- Migration: 015_ensure_mechanical_notes.sql
-- This migration ensures the mechanical_notes column exists even if 004 was not applied

DO $$
BEGIN
    -- Check if column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'buses' 
        AND column_name = 'mechanical_notes'
    ) THEN
        ALTER TABLE buses ADD COLUMN mechanical_notes TEXT;
        COMMENT ON COLUMN buses.mechanical_notes IS 'Anotaciones mecánicas y mantenimiento del bus';
    END IF;
END $$;

