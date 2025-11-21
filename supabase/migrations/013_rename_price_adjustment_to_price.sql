-- Rename price_adjustment to price in route_stops
-- Migration: 013_rename_price_adjustment_to_price.sql
-- The field represents the complete ticket price for that stop, not an adjustment

ALTER TABLE route_stops
  RENAME COLUMN price_adjustment TO price;

-- Update default value and comment
ALTER TABLE route_stops
  ALTER COLUMN price SET DEFAULT 0;

COMMENT ON COLUMN route_stops.price IS 'Precio completo del boleto hasta esta parada (no es un ajuste, es el costo total)';

