-- Discounts system migration
-- Migration: 029_discounts_system.sql

-- Create discount_coupons table
CREATE TABLE IF NOT EXISTS discount_coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),
  min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
  max_discount_amount DECIMAL(10, 2), -- For percentage discounts
  usage_limit INTEGER, -- Total number of times coupon can be used
  usage_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create ticket_discounts table to track applied discounts
CREATE TABLE IF NOT EXISTS ticket_discounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('coupon', 'senior', 'other')),
  discount_code TEXT, -- For coupon discounts
  discount_value DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2) NOT NULL,
  discounted_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add discount columns to tickets table
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_senior BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_code TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_discount_coupons_code ON discount_coupons(code);
CREATE INDEX IF NOT EXISTS idx_discount_coupons_active ON discount_coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_discount_coupons_valid_dates ON discount_coupons(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_ticket_discounts_ticket_id ON ticket_discounts(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_discount_code ON tickets(discount_code);

-- Enable RLS
ALTER TABLE discount_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_discounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for discount_coupons
CREATE POLICY "Anyone can view active discount coupons" ON discount_coupons
  FOR SELECT USING (is_active = true AND (valid_until IS NULL OR valid_until > NOW()));

CREATE POLICY "Admins can manage all discount coupons" ON discount_coupons
  FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- RLS Policies for ticket_discounts
CREATE POLICY "Users can view their own ticket discounts" ON ticket_discounts
  FOR SELECT USING (
    ticket_id IN (
      SELECT id FROM tickets WHERE user_id = auth.uid()
    ) OR
    get_user_role(auth.uid()) IN ('admin', 'pos_agent')
  );

CREATE POLICY "System can create ticket discounts" ON ticket_discounts
  FOR INSERT WITH CHECK (true);

-- Create function to increment coupon usage
CREATE OR REPLACE FUNCTION increment_coupon_usage(coupon_code TEXT)
RETURNS void AS $$
BEGIN
  UPDATE discount_coupons
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE code = UPPER(coupon_code)
    AND (usage_limit IS NULL OR usage_count < usage_limit);
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE discount_coupons IS 'Cupones de descuento disponibles para tickets';
COMMENT ON TABLE ticket_discounts IS 'Descuentos aplicados a tickets específicos';
COMMENT ON COLUMN discount_coupons.discount_type IS 'Tipo de descuento: percentage o fixed';
COMMENT ON COLUMN discount_coupons.discount_value IS 'Valor del descuento (porcentaje o monto fijo)';
COMMENT ON COLUMN tickets.is_senior IS 'Indica si el pasajero es tercera edad (descuento automático)';

