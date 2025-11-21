-- Migration: Ensure schedules table exists
-- This migration ensures the schedules table is created if it doesn't exist
-- Useful if the original migration wasn't applied

-- Create schedules table if it doesn't exist
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

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_schedules_route_id ON schedules(route_id);
CREATE INDEX IF NOT EXISTS idx_schedules_hour ON schedules(hour);
CREATE INDEX IF NOT EXISTS idx_schedules_active ON schedules(is_active);

-- Enable RLS if not already enabled
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Admins can view all schedules" ON schedules;
DROP POLICY IF EXISTS "Bus owners can view schedules for their routes" ON schedules;
DROP POLICY IF EXISTS "Admins can manage schedules" ON schedules;

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

-- Add comments
COMMENT ON TABLE schedules IS 'Horarios disponibles para cada ruta (24 horas del día)';
COMMENT ON COLUMN schedules.hour IS 'Hora del día (0-23)';
COMMENT ON COLUMN schedules.is_express IS 'Si es servicio expreso o normal';
COMMENT ON COLUMN schedules.express_price_multiplier IS 'Multiplicador de precio para servicio expreso';

