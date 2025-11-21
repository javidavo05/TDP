-- Performance Indexes Migration
-- Migration: 009_performance_indexes.sql
-- Optimized for high traffic (30k-80k tickets/month)

-- Composite indexes for tickets table (most queried table)
-- Index for trip-based queries with status filtering
CREATE INDEX IF NOT EXISTS idx_tickets_trip_status_created 
  ON tickets(trip_id, status, created_at DESC);

-- Index for passenger document lookups
CREATE INDEX IF NOT EXISTS idx_tickets_passenger_document 
  ON tickets(passenger_document_id, passenger_document_type) 
  WHERE passenger_document_id IS NOT NULL;

-- Index for POS session queries
CREATE INDEX IF NOT EXISTS idx_tickets_pos_session 
  ON tickets(pos_session_id, created_at DESC) 
  WHERE pos_session_id IS NOT NULL;

-- Partial index for active/paid tickets (most common query)
CREATE INDEX IF NOT EXISTS idx_tickets_active_status 
  ON tickets(trip_id, seat_id, status) 
  WHERE status IN ('paid', 'boarded');

-- Index for date range queries on tickets
CREATE INDEX IF NOT EXISTS idx_tickets_created_at 
  ON tickets(created_at DESC) 
  WHERE created_at >= NOW() - INTERVAL '1 year';

-- Composite indexes for payments table
CREATE INDEX IF NOT EXISTS idx_payments_ticket_status_created 
  ON payments(ticket_id, status, created_at DESC);

-- Index for payment method analytics
CREATE INDEX IF NOT EXISTS idx_payments_method_status_created 
  ON payments(payment_method, status, created_at DESC);

-- Index for POS session payments
CREATE INDEX IF NOT EXISTS idx_payments_pos_session 
  ON payments(pos_session_id, created_at DESC) 
  WHERE pos_session_id IS NOT NULL;

-- Composite indexes for pos_transactions
CREATE INDEX IF NOT EXISTS idx_pos_transactions_session_created 
  ON pos_transactions(session_id, created_at DESC);

-- Index for terminal transaction queries
CREATE INDEX IF NOT EXISTS idx_pos_transactions_terminal_created 
  ON pos_transactions(terminal_id, created_at DESC);

-- Index for transaction type analytics
CREATE INDEX IF NOT EXISTS idx_pos_transactions_type_created 
  ON pos_transactions(transaction_type, created_at DESC);

-- Composite indexes for trip_manifest
CREATE INDEX IF NOT EXISTS idx_trip_manifest_trip_validated 
  ON trip_manifest(trip_id, validated_at DESC);

-- Index for passenger validation history
CREATE INDEX IF NOT EXISTS idx_trip_manifest_passenger_validated 
  ON trip_manifest(passenger_id, validated_at DESC) 
  WHERE passenger_id IS NOT NULL;

-- Index for trips table - most common queries
CREATE INDEX IF NOT EXISTS idx_trips_departure_status 
  ON trips(departure_time, status) 
  WHERE departure_time >= NOW() - INTERVAL '7 days';

-- Index for route-based trip queries
CREATE INDEX IF NOT EXISTS idx_trips_route_departure 
  ON trips(route_id, departure_time DESC);

-- Index for bus-based queries
CREATE INDEX IF NOT EXISTS idx_trips_bus_departure 
  ON trips(bus_id, departure_time DESC);

-- Index for available seats queries
CREATE INDEX IF NOT EXISTS idx_trips_available_seats 
  ON trips(departure_time, available_seats) 
  WHERE available_seats > 0 AND departure_time >= NOW();

-- Index for seats table - bus and seat number lookups
CREATE INDEX IF NOT EXISTS idx_seats_bus_number 
  ON seats(bus_id, seat_number);

-- Index for GPS logs - trip-based queries
CREATE INDEX IF NOT EXISTS idx_gps_logs_trip_timestamp 
  ON gps_logs(trip_id, timestamp DESC);

-- Index for bus owner analytics
CREATE INDEX IF NOT EXISTS idx_buses_owner_active 
  ON buses(owner_id, is_active) 
  WHERE is_active = true;

-- Index for route stops - route and order
CREATE INDEX IF NOT EXISTS idx_route_stops_route_order 
  ON route_stops(route_id, order_index);

-- Add comments
COMMENT ON INDEX idx_tickets_trip_status_created IS 'Optimized for trip-based ticket queries with status filtering';
COMMENT ON INDEX idx_tickets_active_status IS 'Partial index for active tickets (paid/boarded) - most common query';
COMMENT ON INDEX idx_payments_ticket_status_created IS 'Optimized for payment lookups by ticket';
COMMENT ON INDEX idx_pos_transactions_session_created IS 'Optimized for POS session transaction queries';
COMMENT ON INDEX idx_trip_manifest_trip_validated IS 'Optimized for trip manifest validation queries';

