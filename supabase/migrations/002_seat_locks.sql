-- Seat locks table for realtime seat locking
CREATE TABLE seat_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  locked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trip_id, seat_id)
);

-- Indexes
CREATE INDEX idx_seat_locks_trip ON seat_locks(trip_id);
CREATE INDEX idx_seat_locks_seat ON seat_locks(seat_id);
CREATE INDEX idx_seat_locks_expires ON seat_locks(expires_at);

-- Enable RLS
ALTER TABLE seat_locks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seat_locks
-- Anyone can read seat locks (for availability checking)
CREATE POLICY "Seat locks are viewable by everyone" ON seat_locks
  FOR SELECT USING (true);

-- Authenticated users can create locks
CREATE POLICY "Authenticated users can create seat locks" ON seat_locks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can delete their own locks
CREATE POLICY "Users can delete their own seat locks" ON seat_locks
  FOR DELETE USING (auth.uid() = locked_by);

-- Function to clean up expired locks
CREATE OR REPLACE FUNCTION cleanup_expired_seat_locks()
RETURNS void AS $$
BEGIN
  DELETE FROM seat_locks WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Add validated_by column to tickets if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'validated_by'
  ) THEN
    ALTER TABLE tickets ADD COLUMN validated_by UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add terminal_id column to tickets if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'terminal_id'
  ) THEN
    ALTER TABLE tickets ADD COLUMN terminal_id UUID REFERENCES pos_terminals(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add location columns to trips if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trips' AND column_name = 'current_latitude'
  ) THEN
    ALTER TABLE trips ADD COLUMN current_latitude DECIMAL(10, 8);
    ALTER TABLE trips ADD COLUMN current_longitude DECIMAL(11, 8);
    ALTER TABLE trips ADD COLUMN location_updated_at TIMESTAMPTZ;
  END IF;
END $$;

