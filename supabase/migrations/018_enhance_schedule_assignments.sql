-- Enhance schedule_assignments table with missing fields
-- Migration: 018_enhance_schedule_assignments.sql

-- Add missing columns to schedule_assignments
ALTER TABLE schedule_assignments
  ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assistant_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_driver_id ON schedule_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_assistant_id ON schedule_assignments(assistant_id);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_status ON schedule_assignments(status);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_schedule_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_schedule_assignments_updated_at ON schedule_assignments;
CREATE TRIGGER trigger_update_schedule_assignments_updated_at
  BEFORE UPDATE ON schedule_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_assignments_updated_at();

-- Add comments
COMMENT ON COLUMN schedule_assignments.driver_id IS 'ID del chofer asignado al viaje';
COMMENT ON COLUMN schedule_assignments.assistant_id IS 'ID del asistente asignado al viaje';
COMMENT ON COLUMN schedule_assignments.status IS 'Estado de la asignación: assigned, in_progress, completed, cancelled';

