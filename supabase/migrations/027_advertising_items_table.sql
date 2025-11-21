-- Migration: Advertising Items Table
-- Table to store advertising images and videos for POS secondary display

CREATE TABLE IF NOT EXISTS advertising_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  url TEXT NOT NULL,
  duration INTEGER, -- Duration in seconds (only for images)
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_advertising_items_order ON advertising_items("order");

-- Enable RLS
ALTER TABLE advertising_items ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can manage advertising items
CREATE POLICY "Admins can manage advertising items"
  ON advertising_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Everyone can read advertising items (for display)
CREATE POLICY "Everyone can read advertising items"
  ON advertising_items
  FOR SELECT
  USING (true);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_advertising_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER update_advertising_items_updated_at
  BEFORE UPDATE ON advertising_items
  FOR EACH ROW
  EXECUTE FUNCTION update_advertising_items_updated_at();

