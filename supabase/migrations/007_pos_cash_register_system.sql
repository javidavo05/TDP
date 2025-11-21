-- POS Cash Register System Migration
-- Migration: 007_pos_cash_register_system.sql

-- Update pos_terminals table
ALTER TABLE pos_terminals
  DROP COLUMN IF EXISTS location,
  ADD COLUMN IF NOT EXISTS physical_location TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS location_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS initial_cash_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_cash_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opened_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Update existing records to have physical_location
UPDATE pos_terminals
SET physical_location = COALESCE(terminal_identifier, 'Terminal ' || id::text)
WHERE physical_location = '';

-- Create pos_cash_sessions table
CREATE TABLE IF NOT EXISTS pos_cash_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  terminal_id UUID NOT NULL REFERENCES pos_terminals(id) ON DELETE CASCADE,
  opened_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  initial_cash DECIMAL(10,2) NOT NULL DEFAULT 0,
  expected_cash DECIMAL(10,2) DEFAULT 0,
  actual_cash DECIMAL(10,2),
  total_sales DECIMAL(10,2) DEFAULT 0,
  total_cash_sales DECIMAL(10,2) DEFAULT 0,
  total_card_sales DECIMAL(10,2) DEFAULT 0,
  total_tickets INTEGER DEFAULT 0,
  closure_type TEXT CHECK (closure_type IN ('X', 'Z')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create pos_transactions table
CREATE TABLE IF NOT EXISTS pos_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES pos_cash_sessions(id) ON DELETE CASCADE,
  terminal_id UUID NOT NULL REFERENCES pos_terminals(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'refund', 'adjustment')),
  amount DECIMAL(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  received_amount DECIMAL(10,2),
  change_amount DECIMAL(10,2) DEFAULT 0,
  processed_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Update tickets table
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS pos_session_id UUID REFERENCES pos_cash_sessions(id) ON DELETE SET NULL;

-- Update payments table
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS pos_session_id UUID REFERENCES pos_cash_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS received_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS change_amount DECIMAL(10,2) DEFAULT 0;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pos_terminals_location_code ON pos_terminals(location_code);
CREATE INDEX IF NOT EXISTS idx_pos_terminals_assigned_user ON pos_terminals(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_pos_terminals_is_open ON pos_terminals(is_open);
CREATE INDEX IF NOT EXISTS idx_pos_cash_sessions_terminal ON pos_cash_sessions(terminal_id);
CREATE INDEX IF NOT EXISTS idx_pos_cash_sessions_opened_by ON pos_cash_sessions(opened_by_user_id);
CREATE INDEX IF NOT EXISTS idx_pos_cash_sessions_opened_at ON pos_cash_sessions(opened_at);
CREATE INDEX IF NOT EXISTS idx_pos_cash_sessions_closed_at ON pos_cash_sessions(closed_at);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_session ON pos_transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_terminal ON pos_transactions(terminal_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_ticket ON pos_transactions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_payment ON pos_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_created_at ON pos_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_pos_session ON tickets(pos_session_id);
CREATE INDEX IF NOT EXISTS idx_payments_pos_session ON payments(pos_session_id);

-- Add trigger for updated_at on pos_cash_sessions
CREATE TRIGGER update_pos_cash_sessions_updated_at BEFORE UPDATE ON pos_cash_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE pos_cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pos_terminals (update existing)
DROP POLICY IF EXISTS "POS agents can view own terminal" ON pos_terminals;
CREATE POLICY "POS agents can view own terminal" ON pos_terminals
  FOR SELECT USING (
    assigned_user_id = auth.uid() OR
    get_user_role(auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can manage terminals" ON pos_terminals;
CREATE POLICY "Admins can manage terminals" ON pos_terminals
  FOR ALL USING (
    get_user_role(auth.uid()) = 'admin'
  );

-- RLS Policies for pos_cash_sessions
CREATE POLICY "POS agents can view own terminal sessions" ON pos_cash_sessions
  FOR SELECT USING (
    terminal_id IN (
      SELECT id FROM pos_terminals WHERE assigned_user_id = auth.uid()
    ) OR
    get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "POS agents can create sessions for own terminal" ON pos_cash_sessions
  FOR INSERT WITH CHECK (
    terminal_id IN (
      SELECT id FROM pos_terminals WHERE assigned_user_id = auth.uid()
    ) AND
    opened_by_user_id = auth.uid()
  );

CREATE POLICY "POS agents can update own terminal sessions" ON pos_cash_sessions
  FOR UPDATE USING (
    terminal_id IN (
      SELECT id FROM pos_terminals WHERE assigned_user_id = auth.uid()
    ) OR
    get_user_role(auth.uid()) = 'admin'
  );

-- RLS Policies for pos_transactions
CREATE POLICY "POS agents can view own terminal transactions" ON pos_transactions
  FOR SELECT USING (
    terminal_id IN (
      SELECT id FROM pos_terminals WHERE assigned_user_id = auth.uid()
    ) OR
    get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "POS agents can create transactions for own terminal" ON pos_transactions
  FOR INSERT WITH CHECK (
    terminal_id IN (
      SELECT id FROM pos_terminals WHERE assigned_user_id = auth.uid()
    ) AND
    processed_by_user_id = auth.uid()
  );

-- Add comments
COMMENT ON TABLE pos_cash_sessions IS 'Sesiones de caja registradora para cada terminal POS';
COMMENT ON COLUMN pos_cash_sessions.closure_type IS 'X = Cierre parcial (no resetea), Z = Cierre total (resetea)';
COMMENT ON TABLE pos_transactions IS 'Transacciones individuales registradas en cada sesión de caja';
COMMENT ON COLUMN pos_transactions.received_amount IS 'Monto recibido del cliente para validación';
COMMENT ON COLUMN pos_transactions.change_amount IS 'Vuelto dado al cliente';

