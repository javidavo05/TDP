-- Passenger loyalty system migration
-- Migration: 032_passenger_loyalty_system.sql

-- Create loyalty configuration table
CREATE TABLE IF NOT EXISTS loyalty_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier_name TEXT NOT NULL UNIQUE,
  min_points INTEGER NOT NULL DEFAULT 0,
  benefits JSONB DEFAULT '{}'::jsonb,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add loyalty fields to passengers table
ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS total_trips INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_tier TEXT DEFAULT 'bronze';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_passengers_loyalty_tier ON passengers(loyalty_tier);
CREATE INDEX IF NOT EXISTS idx_passengers_loyalty_points ON passengers(loyalty_points);

-- Insert default loyalty tiers
INSERT INTO loyalty_config (tier_name, min_points, benefits, discount_percentage, is_active)
VALUES
  ('bronze', 0, '{"description": "Nivel inicial", "benefits": ["Acceso a ofertas especiales"]}', 0, true),
  ('silver', 100, '{"description": "Nivel intermedio", "benefits": ["Descuento del 5%", "Prioridad en reservas"]}', 5, true),
  ('gold', 250, '{"description": "Nivel avanzado", "benefits": ["Descuento del 10%", "Asientos preferenciales", "Check-in prioritario"]}', 10, true),
  ('platinum', 500, '{"description": "Nivel premium", "benefits": ["Descuento del 15%", "Asientos VIP", "Check-in express", "Soporte prioritario"]}', 15, true)
ON CONFLICT (tier_name) DO NOTHING;

-- Function to update passenger loyalty tier based on points
CREATE OR REPLACE FUNCTION update_passenger_loyalty_tier()
RETURNS TRIGGER AS $$
DECLARE
  new_tier TEXT;
BEGIN
  -- Find the highest tier the passenger qualifies for based on points
  SELECT tier_name INTO new_tier
  FROM loyalty_config
  WHERE min_points <= NEW.loyalty_points
    AND is_active = true
  ORDER BY min_points DESC
  LIMIT 1;

  -- Update tier if found
  IF new_tier IS NOT NULL THEN
    NEW.loyalty_tier := new_tier;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update tier when points change
CREATE TRIGGER trigger_update_loyalty_tier
  BEFORE UPDATE OF loyalty_points ON passengers
  FOR EACH ROW
  EXECUTE FUNCTION update_passenger_loyalty_tier();

-- Function to increment trip count and add points
CREATE OR REPLACE FUNCTION increment_passenger_trips(passenger_document_id TEXT, points_to_add INTEGER DEFAULT 10)
RETURNS VOID AS $$
BEGIN
  UPDATE passengers
  SET 
    total_trips = total_trips + 1,
    loyalty_points = loyalty_points + points_to_add,
    updated_at = NOW()
  WHERE document_id = passenger_document_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE loyalty_config IS 'Configuration for loyalty program tiers and benefits';
COMMENT ON COLUMN passengers.total_trips IS 'Total number of trips taken by this passenger';
COMMENT ON COLUMN passengers.loyalty_points IS 'Accumulated loyalty points';
COMMENT ON COLUMN passengers.loyalty_tier IS 'Current loyalty tier (bronze, silver, gold, platinum)';

