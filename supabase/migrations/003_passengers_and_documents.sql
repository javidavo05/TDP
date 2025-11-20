-- Create document_type enum
CREATE TYPE document_type AS ENUM ('cedula', 'pasaporte');

-- Create passengers table
CREATE TABLE passengers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id TEXT UNIQUE NOT NULL,
  document_type document_type NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  date_of_birth DATE,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create trip_manifest table for tracking validated passengers
CREATE TABLE trip_manifest (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES passengers(id) ON DELETE CASCADE,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add passenger_id and passenger_document_id to tickets table
ALTER TABLE tickets
  ADD COLUMN passenger_id UUID REFERENCES passengers(id) ON DELETE SET NULL,
  ADD COLUMN passenger_document_id TEXT;

-- Create indexes for performance
CREATE INDEX idx_passengers_document_id ON passengers(document_id);
CREATE INDEX idx_passengers_document_type ON passengers(document_type);
CREATE INDEX idx_tickets_passenger_id ON tickets(passenger_id);
CREATE INDEX idx_tickets_passenger_document_id ON tickets(passenger_document_id);
CREATE INDEX idx_trip_manifest_trip_id ON trip_manifest(trip_id);
CREATE INDEX idx_trip_manifest_ticket_id ON trip_manifest(ticket_id);
CREATE INDEX idx_trip_manifest_passenger_id ON trip_manifest(passenger_id);

-- Enable Row Level Security (RLS)
ALTER TABLE passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_manifest ENABLE ROW LEVEL SECURITY;

-- RLS Policies for passengers
-- Admins and bus owners can view all passengers
CREATE POLICY "Admins and owners can view all passengers" ON passengers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'bus_owner')
    )
  );

-- Admins can insert/update passengers
CREATE POLICY "Admins can manage passengers" ON passengers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- RLS Policies for trip_manifest
-- Admins, bus owners, and assistants can view manifests
CREATE POLICY "Authorized users can view manifests" ON trip_manifest
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'bus_owner', 'assistant')
    )
  );

-- Admins, bus owners, and assistants can insert manifests
CREATE POLICY "Authorized users can create manifests" ON trip_manifest
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'bus_owner', 'assistant')
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on passengers
CREATE TRIGGER update_passengers_updated_at
  BEFORE UPDATE ON passengers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

