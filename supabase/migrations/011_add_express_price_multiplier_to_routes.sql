-- Add express_price_multiplier and is_express columns to routes table
-- Migration: 011_add_express_price_multiplier_to_routes.sql
-- These columns are needed for routes that support express service pricing

ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS is_express BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS express_price_multiplier DECIMAL(3,2) DEFAULT 1.2;

-- Add comments
COMMENT ON COLUMN routes.is_express IS 'Indica si esta ruta soporta servicio expreso';
COMMENT ON COLUMN routes.express_price_multiplier IS 'Multiplicador de precio para servicio expreso en esta ruta. Por defecto 1.2 (20% más caro)';

