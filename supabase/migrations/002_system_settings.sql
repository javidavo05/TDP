-- System Settings table for storing application configuration
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('payment', 'email', 'general')),
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create index on category for faster queries
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read settings
CREATE POLICY "Admins can read settings"
  ON system_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Only admins can update settings
CREATE POLICY "Admins can update settings"
  ON system_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Only admins can insert settings
CREATE POLICY "Admins can insert settings"
  ON system_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_system_settings_timestamp
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();

-- Insert default settings
INSERT INTO system_settings (key, value, category, description) VALUES
  ('payment_yappy', '{"enabled": false, "merchant_id": "", "secret_key": "", "api_key": ""}', 'payment', 'Yappy Comercial payment gateway configuration'),
  ('payment_paguelofacil', '{"enabled": false, "api_key": "", "merchant_id": "", "webhook_url": ""}', 'payment', 'PagueloFacil payment gateway configuration'),
  ('payment_tilopay', '{"enabled": false, "api_key": "", "merchant_id": "", "webhook_url": ""}', 'payment', 'Tilopay payment gateway configuration'),
  ('payment_payu', '{"enabled": false, "merchant_id": "", "api_key": "", "api_login": "", "webhook_url": ""}', 'payment', 'PayU payment gateway configuration'),
  ('payment_banesco', '{"enabled": false, "api_key": "", "merchant_id": "", "webhook_url": ""}', 'payment', 'Banesco Panamá payment gateway configuration'),
  ('email_resend', '{"enabled": false, "api_key": "", "from_email": ""}', 'email', 'Resend email service configuration'),
  ('general', '{"company_name": "TDP Ticketing System", "company_logo_url": "", "currency": "USD", "itbms_rate": 0.07, "timezone": "America/Panama", "language": "es"}', 'general', 'General system configuration')
ON CONFLICT (key) DO NOTHING;

