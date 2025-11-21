-- Allow multiple routes per hour migration
-- Migration: 030_allow_multiple_routes_per_hour.sql

-- Drop the unique constraint that prevents multiple routes per hour
ALTER TABLE schedules
  DROP CONSTRAINT IF EXISTS schedules_route_id_hour_is_express_key;

-- Create a new unique constraint that only prevents duplicates of the exact same combination
-- This allows multiple routes at the same hour, but prevents duplicate entries
-- We'll use a composite unique index instead
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedules_route_hour_express_unique 
  ON schedules(route_id, hour, is_express) 
  WHERE is_active = true;

-- Add comment
COMMENT ON INDEX idx_schedules_route_hour_express_unique IS 'Prevents duplicate active schedules for same route, hour, and express type, but allows multiple routes at same hour';

