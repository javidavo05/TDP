-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types
CREATE TYPE user_role AS ENUM ('passenger', 'admin', 'pos_agent', 'bus_owner', 'driver', 'assistant');
CREATE TYPE trip_status AS ENUM ('scheduled', 'boarding', 'in_transit', 'completed', 'cancelled', 'delayed');
CREATE TYPE ticket_status AS ENUM ('pending', 'paid', 'boarded', 'completed', 'cancelled', 'refunded');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('yappy', 'paguelofacil', 'tilopay', 'payu', 'banesco', 'cash', 'card');
CREATE TYPE bus_class AS ENUM ('economico', 'ejecutivo', 'premium');

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  role user_role NOT NULL DEFAULT 'passenger',
  full_name TEXT,
  avatar_url TEXT,
  email_verified_at TIMESTAMPTZ,
  phone_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bus Owners table
CREATE TABLE bus_owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  tax_id TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  accounting_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Bus Presets table (templates for bus configurations)
CREATE TABLE bus_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES bus_owners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  seat_map JSONB NOT NULL, -- Complete seat layout configuration
  bus_class bus_class DEFAULT 'economico',
  features JSONB, -- { wifi: true, ac: true, bathroom: true }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Buses table
CREATE TABLE buses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES bus_owners(id) ON DELETE CASCADE,
  preset_id UUID REFERENCES bus_presets(id) ON DELETE SET NULL,
  plate_number TEXT NOT NULL UNIQUE,
  model TEXT,
  year INTEGER,
  capacity INTEGER NOT NULL,
  seat_map JSONB NOT NULL, -- Seat layout: { seats: [{ id, number, x, y, type, row, column }] }
  bus_class bus_class DEFAULT 'economico',
  features JSONB, -- { wifi: true, ac: true, bathroom: true }
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Routes table
CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  origin TEXT NOT NULL, -- David, Santiago, Panamá
  destination TEXT NOT NULL,
  distance_km DECIMAL(10, 2),
  estimated_duration_minutes INTEGER,
  base_price DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Route Stops table
CREATE TABLE route_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  km_position DECIMAL(10, 2) NOT NULL,
  order_index INTEGER NOT NULL,
  price_adjustment DECIMAL(10, 2) DEFAULT 0, -- Price difference from base
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(route_id, order_index)
);

-- Trips table
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE RESTRICT,
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE RESTRICT,
  departure_time TIMESTAMPTZ NOT NULL,
  arrival_estimate TIMESTAMPTZ,
  status trip_status DEFAULT 'scheduled',
  current_stop_id UUID REFERENCES route_stops(id),
  available_seats INTEGER NOT NULL,
  total_seats INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seats table (derived from bus seat_map but stored for quick queries)
CREATE TABLE seats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  seat_number TEXT NOT NULL,
  position_x DECIMAL(10, 2),
  position_y DECIMAL(10, 2),
  seat_type TEXT, -- 'individual', 'double', 'row'
  row_number INTEGER,
  column_number INTEGER,
  metadata JSONB,
  UNIQUE(bus_id, seat_number)
);

-- Tickets table
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Nullable for guest purchases
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
  seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE RESTRICT,
  qr_code TEXT UNIQUE NOT NULL,
  qr_token TEXT UNIQUE, -- Token for sharing
  status ticket_status DEFAULT 'pending',
  passenger_name TEXT NOT NULL,
  passenger_phone TEXT,
  passenger_email TEXT,
  boarding_stop_id UUID REFERENCES route_stops(id),
  destination_stop_id UUID NOT NULL REFERENCES route_stops(id),
  price DECIMAL(10, 2) NOT NULL,
  itbms DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10, 2) NOT NULL,
  boarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  payment_method payment_method NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  itbms DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  status payment_status DEFAULT 'pending',
  provider_transaction_id TEXT,
  provider_response JSONB,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- POS Terminals table
CREATE TABLE pos_terminals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  terminal_identifier TEXT UNIQUE NOT NULL,
  location TEXT NOT NULL, -- David, Santiago, Panamá
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- POS Display Sessions table (for double screen functionality)
CREATE TABLE pos_display_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL,
  terminal_id UUID REFERENCES pos_terminals(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  selected_seat_id UUID REFERENCES seats(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GPS Logs table
CREATE TABLE gps_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  speed DECIMAL(5, 2), -- km/h
  heading DECIMAL(5, 2), -- degrees
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Analytics summary tables
CREATE TABLE daily_bus_revenue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES bus_owners(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_tickets INTEGER NOT NULL DEFAULT 0,
  total_itbms DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bus_id, date)
);

CREATE TABLE occupancy_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  total_seats INTEGER NOT NULL,
  occupied_seats INTEGER NOT NULL DEFAULT 0,
  occupancy_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE route_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_trips INTEGER NOT NULL DEFAULT 0,
  total_passengers INTEGER NOT NULL DEFAULT 0,
  total_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(route_id, date)
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_buses_owner ON buses(owner_id);
CREATE INDEX idx_buses_plate ON buses(plate_number);
CREATE INDEX idx_trips_bus ON trips(bus_id);
CREATE INDEX idx_trips_route ON trips(route_id);
CREATE INDEX idx_trips_departure ON trips(departure_time);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_tickets_user ON tickets(user_id);
CREATE INDEX idx_tickets_trip ON tickets(trip_id);
CREATE INDEX idx_tickets_qr ON tickets(qr_code);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_payments_ticket ON payments(ticket_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_gps_logs_trip ON gps_logs(trip_id);
CREATE INDEX idx_gps_logs_timestamp ON gps_logs(timestamp);
CREATE INDEX idx_pos_display_sessions_session ON pos_display_sessions(session_id);
CREATE INDEX idx_pos_display_sessions_expires ON pos_display_sessions(expires_at);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bus_owners_updated_at BEFORE UPDATE ON bus_owners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buses_updated_at BEFORE UPDATE ON buses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_display_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_bus_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE occupancy_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_usage ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Bus Owners policies
CREATE POLICY "Owners can view own data" ON bus_owners
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Owners can update own data" ON bus_owners
  FOR UPDATE USING (user_id = auth.uid());

-- Buses policies
CREATE POLICY "Public can view active buses" ON buses
  FOR SELECT USING (is_active = true);

CREATE POLICY "Owners can manage own buses" ON buses
  FOR ALL USING (
    owner_id IN (SELECT id FROM bus_owners WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Routes policies (public read, admin write)
CREATE POLICY "Public can view active routes" ON routes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage routes" ON routes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Trips policies
CREATE POLICY "Public can view scheduled trips" ON trips
  FOR SELECT USING (status IN ('scheduled', 'boarding', 'in_transit'));

CREATE POLICY "Admins and owners can manage trips" ON trips
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') OR
    EXISTS (
      SELECT 1 FROM buses b
      JOIN bus_owners bo ON b.owner_id = bo.id
      WHERE b.id = trips.bus_id AND bo.user_id = auth.uid()
    )
  );

-- Tickets policies
CREATE POLICY "Users can view own tickets" ON tickets
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'pos_agent', 'assistant'))
  );

CREATE POLICY "Public can create tickets" ON tickets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own tickets" ON tickets
  FOR UPDATE USING (user_id = auth.uid());

-- Payments policies
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = payments.ticket_id AND tickets.user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'pos_agent'))
  );

CREATE POLICY "Public can create payments" ON payments
  FOR INSERT WITH CHECK (true);

-- GPS Logs policies
CREATE POLICY "Drivers can insert GPS logs" ON gps_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'driver')
  );

CREATE POLICY "Public can view GPS for active trips" ON gps_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = gps_logs.trip_id
      AND trips.status IN ('boarding', 'in_transit')
    )
  );

-- POS Display Sessions policies (public read for display screens)
CREATE POLICY "Public can view display sessions" ON pos_display_sessions
  FOR SELECT USING (expires_at > NOW());

CREATE POLICY "POS agents can manage display sessions" ON pos_display_sessions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('pos_agent', 'admin'))
  );

