-- Add additional fields to buses table
-- Migration: 004_bus_additional_fields.sql

ALTER TABLE buses
  ADD COLUMN IF NOT EXISTS unit_number TEXT,
  ADD COLUMN IF NOT EXISTS mechanical_notes TEXT;

-- Add index on unit_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_buses_unit_number ON buses(unit_number);

-- Add comment to columns
COMMENT ON COLUMN buses.unit_number IS 'Número de unidad del bus';
COMMENT ON COLUMN buses.mechanical_notes IS 'Anotaciones mecánicas y mantenimiento del bus';

