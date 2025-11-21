-- Migration: Indexes for Trip Synchronization Performance
-- These indexes optimize queries used by the real-time synchronization system

-- Index for tickets by trip_id and status (used by trigger and availability queries)
CREATE INDEX IF NOT EXISTS idx_tickets_trip_status ON tickets(trip_id, status) 
WHERE status IN ('paid', 'boarded');

-- Index for trips by departure_time and status (used for schedule matching)
CREATE INDEX IF NOT EXISTS idx_trips_departure_status ON trips(departure_time, status) 
WHERE status IN ('scheduled', 'boarding');

-- Index for schedule_assignments by date (used for POS schedule queries)
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_date ON schedule_assignments(date);

-- Index for schedule_assignments by schedule_id and date (used for matching)
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_schedule_date ON schedule_assignments(schedule_id, date);

-- Index for trips by route_id and departure_time (used for matching trips to schedules)
CREATE INDEX IF NOT EXISTS idx_trips_route_departure ON trips(route_id, departure_time);

-- Composite index for tickets lookup by trip and seat (used for availability checks)
CREATE INDEX IF NOT EXISTS idx_tickets_trip_seat ON tickets(trip_id, seat_id) 
WHERE status IN ('paid', 'boarded');

