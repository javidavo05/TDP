-- Migration: Advertising Settings Table
-- Table to store advertising settings like default image

CREATE TABLE IF NOT EXISTS advertising_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  default_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE advertising_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can manage advertising settings
CREATE POLICY "Admins can manage advertising settings"
  ON advertising_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Everyone can read advertising settings (for display)
CREATE POLICY "Everyone can read advertising settings"
  ON advertising_settings
  FOR SELECT
  USING (true);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_advertising_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER update_advertising_settings_updated_at
  BEFORE UPDATE ON advertising_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_advertising_settings_updated_at();

