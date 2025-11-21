-- Add odometer and distance tracking to buses
-- Migration: 019_add_bus_odometer.sql

-- Add odometer fields to buses table
ALTER TABLE buses
  ADD COLUMN IF NOT EXISTS odometer DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_distance_traveled DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_trip_date TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN buses.odometer IS 'Odómetro actual del bus (kilometraje actual)';
COMMENT ON COLUMN buses.total_distance_traveled IS 'Distancia total acumulada recorrida por el bus (en kilómetros)';
COMMENT ON COLUMN buses.last_trip_date IS 'Fecha y hora del último viaje completado';

-- Create index for last_trip_date for efficient queries
CREATE INDEX IF NOT EXISTS idx_buses_last_trip_date ON buses(last_trip_date);

