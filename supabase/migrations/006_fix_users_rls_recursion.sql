-- Fix infinite recursion in users RLS policies
-- Migration: 006_fix_users_rls_recursion.sql

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Create a function to check user role without causing recursion
-- This function uses SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role_val user_role;
BEGIN
  SELECT role INTO user_role_val
  FROM users
  WHERE id = user_id;
  
  -- Return 'passenger' as default if user not found
  RETURN COALESCE(user_role_val, 'passenger'::user_role);
END;
$$;

-- New policy: Users can always view their own profile
-- This is safe because they can only see their own record
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- New policy: Admins can view all users
-- Uses the function to avoid recursion
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    get_user_role(auth.uid()) = 'admin'
  );

-- Policy to allow users to insert their own profile
-- This is needed when creating users from auth signup
-- The id must match auth.uid() to ensure users can only create their own profile
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Also update the bus_owners policy to use the function
DROP POLICY IF EXISTS "Owners can view own data" ON bus_owners;
CREATE POLICY "Owners can view own data" ON bus_owners
  FOR SELECT USING (
    user_id = auth.uid() OR
    get_user_role(auth.uid()) = 'admin'
  );

-- Update buses policy
DROP POLICY IF EXISTS "Owners can manage own buses" ON buses;
CREATE POLICY "Owners can manage own buses" ON buses
  FOR ALL USING (
    owner_id IN (SELECT id FROM bus_owners WHERE user_id = auth.uid()) OR
    get_user_role(auth.uid()) = 'admin'
  );

-- Update routes policy
DROP POLICY IF EXISTS "Admins can manage routes" ON routes;
CREATE POLICY "Admins can manage routes" ON routes
  FOR ALL USING (
    get_user_role(auth.uid()) = 'admin'
  );

-- Update trips policy
DROP POLICY IF EXISTS "Admins and owners can manage trips" ON trips;
CREATE POLICY "Admins and owners can manage trips" ON trips
  FOR ALL USING (
    get_user_role(auth.uid()) = 'admin' OR
    EXISTS (
      SELECT 1 FROM buses b
      JOIN bus_owners bo ON b.owner_id = bo.id
      WHERE b.id = trips.bus_id AND bo.user_id = auth.uid()
    )
  );

-- Update tickets policy
DROP POLICY IF EXISTS "Users can view own tickets" ON tickets;
CREATE POLICY "Users can view own tickets" ON tickets
  FOR SELECT USING (
    user_id = auth.uid() OR
    get_user_role(auth.uid()) IN ('admin', 'pos_agent', 'assistant')
  );

-- Update payments policy
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = payments.ticket_id AND tickets.user_id = auth.uid()
    ) OR
    get_user_role(auth.uid()) IN ('admin', 'pos_agent')
  );

-- Update GPS logs policy
DROP POLICY IF EXISTS "Drivers can insert GPS logs" ON gps_logs;
CREATE POLICY "Drivers can insert GPS logs" ON gps_logs
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) = 'driver'
  );

-- Update POS display sessions policy
DROP POLICY IF EXISTS "POS agents can manage display sessions" ON pos_display_sessions;
CREATE POLICY "POS agents can manage display sessions" ON pos_display_sessions
  FOR ALL USING (
    get_user_role(auth.uid()) IN ('pos_agent', 'admin')
  );
