-- Migration: Bus Assignment Changes History
-- Tracks all changes to bus assignments with reason

CREATE TABLE IF NOT EXISTS bus_assignment_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES schedule_assignments(id) ON DELETE CASCADE,
  old_bus_id UUID REFERENCES buses(id) ON DELETE SET NULL,
  new_bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignment_changes_assignment_id ON bus_assignment_changes(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_changes_old_bus_id ON bus_assignment_changes(old_bus_id);
CREATE INDEX IF NOT EXISTS idx_assignment_changes_new_bus_id ON bus_assignment_changes(new_bus_id);
CREATE INDEX IF NOT EXISTS idx_assignment_changes_changed_by ON bus_assignment_changes(changed_by);
CREATE INDEX IF NOT EXISTS idx_assignment_changes_changed_at ON bus_assignment_changes(changed_at);

-- RLS Policies
ALTER TABLE bus_assignment_changes ENABLE ROW LEVEL SECURITY;

-- Admins can view all changes
CREATE POLICY "Admins can view all assignment changes"
  ON bus_assignment_changes FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Admins can create changes
CREATE POLICY "Admins can create assignment changes"
  ON bus_assignment_changes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Bus owners can view changes for their buses
CREATE POLICY "Bus owners can view changes for their buses"
  ON bus_assignment_changes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'bus_owner'
    )
    AND (
      EXISTS (
        SELECT 1 FROM buses 
        WHERE buses.id = bus_assignment_changes.old_bus_id 
        AND buses.owner_id IN (
          SELECT id FROM bus_owners WHERE user_id = auth.uid()
        )
      )
      OR EXISTS (
        SELECT 1 FROM buses 
        WHERE buses.id = bus_assignment_changes.new_bus_id 
        AND buses.owner_id IN (
          SELECT id FROM bus_owners WHERE user_id = auth.uid()
        )
      )
    )
  );

