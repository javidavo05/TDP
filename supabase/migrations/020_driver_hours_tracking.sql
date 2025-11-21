-- Driver hours tracking system
-- Migration: 020_driver_hours_tracking.sql

-- Create driver_hours_tracking table
CREATE TABLE IF NOT EXISTS driver_hours_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  hours_worked DECIMAL(5, 2) DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create driver_hours_config table
CREATE TABLE IF NOT EXISTS driver_hours_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  max_hours_per_day DECIMAL(5, 2) DEFAULT 8.0,
  max_hours_per_week DECIMAL(5, 2) DEFAULT 40.0,
  max_hours_per_month DECIMAL(5, 2) DEFAULT 160.0,
  rest_hours_required DECIMAL(5, 2) DEFAULT 11.0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default config if not exists
INSERT INTO driver_hours_config (id, max_hours_per_day, max_hours_per_week, max_hours_per_month, rest_hours_required)
VALUES (uuid_generate_v4(), 8.0, 40.0, 160.0, 11.0)
ON CONFLICT DO NOTHING;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_driver_hours_tracking_driver_id ON driver_hours_tracking(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_hours_tracking_trip_id ON driver_hours_tracking(trip_id);
CREATE INDEX IF NOT EXISTS idx_driver_hours_tracking_date ON driver_hours_tracking(date);
CREATE INDEX IF NOT EXISTS idx_driver_hours_tracking_driver_date ON driver_hours_tracking(driver_id, date);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_driver_hours_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_driver_hours_tracking_updated_at ON driver_hours_tracking;
CREATE TRIGGER trigger_update_driver_hours_tracking_updated_at
  BEFORE UPDATE ON driver_hours_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_hours_tracking_updated_at();

-- Add comments
COMMENT ON TABLE driver_hours_tracking IS 'Registro de horas de conducción por chofer';
COMMENT ON COLUMN driver_hours_tracking.driver_id IS 'ID del chofer';
COMMENT ON COLUMN driver_hours_tracking.trip_id IS 'ID del viaje asociado';
COMMENT ON COLUMN driver_hours_tracking.hours_worked IS 'Horas trabajadas en este período';
COMMENT ON COLUMN driver_hours_tracking.date IS 'Fecha del registro';
COMMENT ON TABLE driver_hours_config IS 'Configuración de límites de horas de conducción';
COMMENT ON COLUMN driver_hours_config.max_hours_per_day IS 'Máximo de horas permitidas por día';
COMMENT ON COLUMN driver_hours_config.max_hours_per_week IS 'Máximo de horas permitidas por semana';
COMMENT ON COLUMN driver_hours_config.max_hours_per_month IS 'Máximo de horas permitidas por mes';
COMMENT ON COLUMN driver_hours_config.rest_hours_required IS 'Horas de descanso requeridas entre turnos';

-- Add RLS policies
ALTER TABLE driver_hours_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_hours_config ENABLE ROW LEVEL SECURITY;

-- Policies for driver_hours_tracking
CREATE POLICY "Admins can view all driver hours"
  ON driver_hours_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Drivers can view their own hours"
  ON driver_hours_tracking FOR SELECT
  USING (
    driver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage driver hours"
  ON driver_hours_tracking FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policies for driver_hours_config
CREATE POLICY "Admins can view driver hours config"
  ON driver_hours_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage driver hours config"
  ON driver_hours_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

