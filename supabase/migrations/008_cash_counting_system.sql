-- Cash Counting System Migration
-- Migration: 008_cash_counting_system.sql

-- Add columns to pos_cash_sessions for cash counting validation
ALTER TABLE pos_cash_sessions
  ADD COLUMN IF NOT EXISTS counted_total DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS manual_total DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS count_discrepancy DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discrepancy_notes TEXT;

-- Create cash_count_breakdown table
CREATE TABLE IF NOT EXISTS cash_count_breakdown (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES pos_cash_sessions(id) ON DELETE CASCADE,
  denomination DECIMAL(10,2) NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('bill', 'coin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, denomination, type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cash_count_breakdown_session ON cash_count_breakdown(session_id);
CREATE INDEX IF NOT EXISTS idx_cash_count_breakdown_type ON cash_count_breakdown(type);

-- Enable RLS
ALTER TABLE cash_count_breakdown ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cash_count_breakdown
CREATE POLICY "POS agents can view own terminal cash breakdowns" ON cash_count_breakdown
  FOR SELECT USING (
    session_id IN (
      SELECT cs.id FROM pos_cash_sessions cs
      JOIN pos_terminals pt ON cs.terminal_id = pt.id
      WHERE pt.assigned_user_id = auth.uid()
    ) OR
    get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "POS agents can create cash breakdowns for own terminal" ON cash_count_breakdown
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT cs.id FROM pos_cash_sessions cs
      JOIN pos_terminals pt ON cs.terminal_id = pt.id
      WHERE pt.assigned_user_id = auth.uid()
    ) OR
    get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can manage all cash breakdowns" ON cash_count_breakdown
  FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Add comments
COMMENT ON TABLE cash_count_breakdown IS 'Desglose detallado de billetes y monedas por sesión de caja';
COMMENT ON COLUMN cash_count_breakdown.denomination IS 'Valor de la denominación (ej: 100.00, 50.00, 1.00, 0.25)';
COMMENT ON COLUMN cash_count_breakdown.count IS 'Cantidad de billetes/monedas de esta denominación';
COMMENT ON COLUMN cash_count_breakdown.type IS 'bill = billete, coin = moneda';
COMMENT ON COLUMN pos_cash_sessions.counted_total IS 'Total calculado sumando todas las denominaciones';
COMMENT ON COLUMN pos_cash_sessions.manual_total IS 'Total ingresado manualmente para validación';
COMMENT ON COLUMN pos_cash_sessions.count_discrepancy IS 'Diferencia entre counted_total y manual_total';
COMMENT ON COLUMN pos_cash_sessions.discrepancy_notes IS 'Notas sobre discrepancias en el conteo';

