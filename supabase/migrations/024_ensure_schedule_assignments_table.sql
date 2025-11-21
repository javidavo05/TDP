-- Migration: Ensure schedule_assignments table exists
-- This migration ensures the schedule_assignments table is created if it doesn't exist

-- Create schedule_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS schedule_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assistant_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE(schedule_id, bus_id, date)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_schedule_id ON schedule_assignments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_bus_id ON schedule_assignments(bus_id);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_date ON schedule_assignments(date);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_schedule_date ON schedule_assignments(schedule_id, date);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_driver_id ON schedule_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_assistant_id ON schedule_assignments(assistant_id);

-- Enable RLS if not already enabled
ALTER TABLE schedule_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Admins can view all schedule assignments" ON schedule_assignments;
DROP POLICY IF EXISTS "Bus owners can view assignments for their buses" ON schedule_assignments;
DROP POLICY IF EXISTS "Admins can manage schedule assignments" ON schedule_assignments;

-- Policies for schedule_assignments
CREATE POLICY "Admins can view all schedule assignments"
  ON schedule_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Bus owners can view assignments for their buses"
  ON schedule_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      JOIN bus_owners ON bus_owners.user_id = users.id
      JOIN buses ON buses.owner_id = bus_owners.id
      WHERE users.id = auth.uid()
      AND users.role = 'bus_owner'
      AND buses.id = schedule_assignments.bus_id
    )
  );

CREATE POLICY "Admins can manage schedule assignments"
  ON schedule_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Add comments
COMMENT ON TABLE schedule_assignments IS 'Asignación de buses a horarios específicos por fecha';
COMMENT ON COLUMN schedule_assignments.date IS 'Fecha específica de la asignación';
COMMENT ON COLUMN schedule_assignments.status IS 'Estado de la asignación: assigned, in_progress, completed, cancelled';

