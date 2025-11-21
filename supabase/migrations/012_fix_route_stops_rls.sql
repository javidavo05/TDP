-- Fix RLS Policies for route_stops
-- Migration: 012_fix_route_stops_rls.sql
-- Allows admins to manage all route_stops, and bus_owners to view stops for their routes

-- Enable RLS (should already be enabled, but ensure it)
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can manage all route stops" ON route_stops;
DROP POLICY IF EXISTS "Bus owners can view stops for their routes" ON route_stops;
DROP POLICY IF EXISTS "Users can view route stops" ON route_stops;

-- Admins can manage ALL route stops
CREATE POLICY "Admins can manage all route stops" ON route_stops
  FOR ALL USING (
    get_user_role(auth.uid()) = 'admin'
  )
  WITH CHECK (
    get_user_role(auth.uid()) = 'admin'
  );

-- Bus owners can view stops for routes of their buses
CREATE POLICY "Bus owners can view stops for their routes" ON route_stops
  FOR SELECT USING (
    route_id IN (
      SELECT DISTINCT t.route_id 
      FROM trips t
      JOIN buses b ON t.bus_id = b.id
      JOIN bus_owners bo ON b.owner_id = bo.id
      WHERE bo.user_id = auth.uid()
    ) OR
    route_id IN (
      SELECT r.id 
      FROM routes r
      WHERE EXISTS (
        SELECT 1 FROM trips t
        JOIN buses b ON t.bus_id = b.id
        JOIN bus_owners bo ON b.owner_id = bo.id
        WHERE t.route_id = r.id AND bo.user_id = auth.uid()
      )
    )
  );

-- Public users can view route stops (for ticket booking)
CREATE POLICY "Users can view route stops" ON route_stops
  FOR SELECT USING (true);

-- Add comment
COMMENT ON TABLE route_stops IS 'Paradas intermedias de las rutas. El campo price representa el costo completo del boleto hasta esa parada.';

