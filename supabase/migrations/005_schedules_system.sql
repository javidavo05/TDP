-- Schedules system migration
-- Migration: 005_schedules_system.sql

-- Add express fields to routes table
ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS is_express BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS express_price_multiplier DECIMAL(3,2) DEFAULT 1.2;

-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
  is_express BOOLEAN DEFAULT false,
  express_price_multiplier DECIMAL(3,2) DEFAULT 1.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(route_id, hour, is_express)
);

-- Create schedule_assignments table
CREATE TABLE IF NOT EXISTS schedule_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(schedule_id, bus_id, date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_schedules_route_id ON schedules(route_id);
CREATE INDEX IF NOT EXISTS idx_schedules_hour ON schedules(hour);
CREATE INDEX IF NOT EXISTS idx_schedules_active ON schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_schedule_id ON schedule_assignments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_bus_id ON schedule_assignments(bus_id);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_date ON schedule_assignments(date);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_schedule_date ON schedule_assignments(schedule_id, date);

-- Add comments
COMMENT ON TABLE schedules IS 'Horarios disponibles para cada ruta (24 horas del día)';
COMMENT ON COLUMN schedules.hour IS 'Hora del día (0-23)';
COMMENT ON COLUMN schedules.is_express IS 'Si es servicio expreso o normal';
COMMENT ON COLUMN schedules.express_price_multiplier IS 'Multiplicador de precio para servicio expreso';
COMMENT ON TABLE schedule_assignments IS 'Asignación de buses a horarios específicos por fecha';
COMMENT ON COLUMN schedule_assignments.date IS 'Fecha específica de la asignación';

-- Add RLS policies
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for schedules
CREATE POLICY "Admins can view all schedules"
  ON schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Bus owners can view schedules for their routes"
  ON schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      JOIN bus_owners ON bus_owners.user_id = users.id
      WHERE users.id = auth.uid()
      AND users.role = 'bus_owner'
    )
  );

CREATE POLICY "Admins can manage schedules"
  ON schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

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

