-- Fix RLS Policies for buses table to ensure admins and owners can see all their buses
-- Migration: 017_fix_buses_rls_select_policies.sql
-- The issue is that "Public can view active buses" policy might be interfering
-- We need separate SELECT policies for different user types

-- Drop existing policies
DROP POLICY IF EXISTS "Public can view active buses" ON buses;
DROP POLICY IF EXISTS "Owners can manage own buses" ON buses;

-- Policy 1: Public can view active buses (for public ticket booking)
-- This is for unauthenticated users or passengers
CREATE POLICY "Public can view active buses" ON buses
  FOR SELECT USING (
    is_active = true AND
    get_user_role(auth.uid()) IN ('passenger', 'driver', 'assistant') OR
    auth.uid() IS NULL
  );

-- Policy 2: Bus owners can view their own buses (all buses, active and inactive)
CREATE POLICY "Bus owners can view own buses" ON buses
  FOR SELECT USING (
    owner_id IN (SELECT id FROM bus_owners WHERE user_id = auth.uid())
  );

-- Policy 3: Admins can view all buses (all buses, active and inactive)
CREATE POLICY "Admins can view all buses" ON buses
  FOR SELECT USING (
    get_user_role(auth.uid()) = 'admin'
  );

-- Policy 4: Bus owners can insert/update/delete their own buses
CREATE POLICY "Bus owners can manage own buses" ON buses
  FOR INSERT, UPDATE, DELETE USING (
    owner_id IN (SELECT id FROM bus_owners WHERE user_id = auth.uid())
  )
  WITH CHECK (
    owner_id IN (SELECT id FROM bus_owners WHERE user_id = auth.uid())
  );

-- Policy 5: Admins can insert/update/delete all buses
CREATE POLICY "Admins can manage all buses" ON buses
  FOR INSERT, UPDATE, DELETE USING (
    get_user_role(auth.uid()) = 'admin'
  )
  WITH CHECK (
    get_user_role(auth.uid()) = 'admin'
  );

-- Add comment
COMMENT ON TABLE buses IS 'Buses table. RLS policies: public sees active buses, owners see/manage their buses, admins see/manage all buses.';

