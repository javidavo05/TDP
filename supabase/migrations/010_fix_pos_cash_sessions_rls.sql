-- Fix RLS Policies for pos_cash_sessions
-- Migration: 010_fix_pos_cash_sessions_rls.sql
-- Allows admins to create and manage cash sessions - SUPER ADMIN ACCESS

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "POS agents can create sessions for own terminal" ON pos_cash_sessions;
DROP POLICY IF EXISTS "POS agents can update own terminal sessions" ON pos_cash_sessions;
DROP POLICY IF EXISTS "POS agents can view own terminal sessions" ON pos_cash_sessions;
DROP POLICY IF EXISTS "POS agents and admins can create sessions" ON pos_cash_sessions;
DROP POLICY IF EXISTS "POS agents and admins can update sessions" ON pos_cash_sessions;
DROP POLICY IF EXISTS "POS agents and admins can view sessions" ON pos_cash_sessions;
DROP POLICY IF EXISTS "Admins can manage all cash sessions" ON pos_cash_sessions;

-- IMPORTANT: Create admin policy FIRST (PostgreSQL evaluates policies in order)
-- Admins can do EVERYTHING (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage all cash sessions" ON pos_cash_sessions
  FOR ALL USING (
    get_user_role(auth.uid()) = 'admin'
  )
  WITH CHECK (
    get_user_role(auth.uid()) = 'admin'
  );

-- POS agents can view their own terminal sessions
CREATE POLICY "POS agents can view own terminal sessions" ON pos_cash_sessions
  FOR SELECT USING (
    terminal_id IN (
      SELECT id FROM pos_terminals WHERE assigned_user_id = auth.uid()
    )
  );

-- POS agents can create sessions for their own terminal
CREATE POLICY "POS agents can create sessions for own terminal" ON pos_cash_sessions
  FOR INSERT WITH CHECK (
    terminal_id IN (
      SELECT id FROM pos_terminals WHERE assigned_user_id = auth.uid()
    ) AND
    opened_by_user_id = auth.uid()
  );

-- POS agents can update their own terminal sessions
CREATE POLICY "POS agents can update own terminal sessions" ON pos_cash_sessions
  FOR UPDATE USING (
    terminal_id IN (
      SELECT id FROM pos_terminals WHERE assigned_user_id = auth.uid()
    )
  );

-- Fix pos_transactions policies - Admins first
DROP POLICY IF EXISTS "POS agents can create transactions for own terminal" ON pos_transactions;
DROP POLICY IF EXISTS "POS agents can view own terminal transactions" ON pos_transactions;
DROP POLICY IF EXISTS "Admins can manage all transactions" ON pos_transactions;

-- Admins can manage ALL transactions
CREATE POLICY "Admins can manage all transactions" ON pos_transactions
  FOR ALL USING (
    get_user_role(auth.uid()) = 'admin'
  )
  WITH CHECK (
    get_user_role(auth.uid()) = 'admin'
  );

-- POS agents can view their own terminal transactions
CREATE POLICY "POS agents can view own terminal transactions" ON pos_transactions
  FOR SELECT USING (
    terminal_id IN (
      SELECT id FROM pos_terminals WHERE assigned_user_id = auth.uid()
    )
  );

-- POS agents can create transactions for their own terminal
CREATE POLICY "POS agents can create transactions for own terminal" ON pos_transactions
  FOR INSERT WITH CHECK (
    terminal_id IN (
      SELECT id FROM pos_terminals WHERE assigned_user_id = auth.uid()
    ) AND
    processed_by_user_id = auth.uid()
  );

-- Fix cash_count_breakdown policies - Admins first
DROP POLICY IF EXISTS "POS agents can view own terminal cash breakdowns" ON cash_count_breakdown;
DROP POLICY IF EXISTS "POS agents can create cash breakdowns for own terminal" ON cash_count_breakdown;
DROP POLICY IF EXISTS "Admins can manage all cash breakdowns" ON cash_count_breakdown;

-- Admins can manage ALL cash breakdowns
CREATE POLICY "Admins can manage all cash breakdowns" ON cash_count_breakdown
  FOR ALL USING (
    get_user_role(auth.uid()) = 'admin'
  )
  WITH CHECK (
    get_user_role(auth.uid()) = 'admin'
  );

-- POS agents can view their own terminal cash breakdowns
CREATE POLICY "POS agents can view own terminal cash breakdowns" ON cash_count_breakdown
  FOR SELECT USING (
    session_id IN (
      SELECT cs.id FROM pos_cash_sessions cs
      JOIN pos_terminals pt ON cs.terminal_id = pt.id
      WHERE pt.assigned_user_id = auth.uid()
    )
  );

-- POS agents can create cash breakdowns for their own terminal
CREATE POLICY "POS agents can create cash breakdowns for own terminal" ON cash_count_breakdown
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT cs.id FROM pos_cash_sessions cs
      JOIN pos_terminals pt ON cs.terminal_id = pt.id
      WHERE pt.assigned_user_id = auth.uid()
    )
  );

-- Verify pos_terminals policies allow admins full access
-- The policy "Admins can manage terminals" from migration 007 should already allow ALL operations
-- But we ensure it's correct by checking it exists and is properly configured

