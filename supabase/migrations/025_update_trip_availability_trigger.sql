-- Migration: Automatic Trip Availability Updates via Trigger
-- This trigger automatically updates available_seats when tickets are created, updated, or deleted

-- Function to update available_seats
CREATE OR REPLACE FUNCTION update_trip_available_seats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Ticket creado
    IF NEW.status IN ('paid', 'boarded') THEN
      UPDATE trips
      SET available_seats = GREATEST(0, available_seats - 1),
          updated_at = NOW()
      WHERE id = NEW.trip_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Status cambiado
    IF (OLD.status NOT IN ('paid', 'boarded') AND NEW.status IN ('paid', 'boarded')) THEN
      -- Se convirtió en ocupado (de pending a paid/boarded)
      UPDATE trips 
      SET available_seats = GREATEST(0, available_seats - 1),
          updated_at = NOW()
      WHERE id = NEW.trip_id;
    ELSIF (OLD.status IN ('paid', 'boarded') AND NEW.status NOT IN ('paid', 'boarded')) THEN
      -- Se liberó (de paid/boarded a cancelled/refunded)
      UPDATE trips 
      SET available_seats = LEAST(total_seats, available_seats + 1),
          updated_at = NOW()
      WHERE id = NEW.trip_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Ticket eliminado
    IF OLD.status IN ('paid', 'boarded') THEN
      UPDATE trips
      SET available_seats = LEAST(total_seats, available_seats + 1),
          updated_at = NOW()
      WHERE id = OLD.trip_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trip_availability_trigger ON tickets;

-- Create trigger
CREATE TRIGGER trip_availability_trigger
AFTER INSERT OR UPDATE OR DELETE ON tickets
FOR EACH ROW
EXECUTE FUNCTION update_trip_available_seats();

-- Function to recalcular disponibilidad de un trip (útil para corregir inconsistencias)
CREATE OR REPLACE FUNCTION recalculate_trip_availability(trip_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE trips
  SET available_seats = total_seats - (
    SELECT COUNT(*) 
    FROM tickets 
    WHERE trip_id = trip_uuid 
    AND status IN ('paid', 'boarded')
  ),
  updated_at = NOW()
  WHERE id = trip_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to recalcular todos los trips (útil para migración o corrección masiva)
CREATE OR REPLACE FUNCTION recalculate_all_trips_availability()
RETURNS void AS $$
BEGIN
  UPDATE trips
  SET available_seats = total_seats - (
    SELECT COUNT(*) 
    FROM tickets 
    WHERE tickets.trip_id = trips.id 
    AND tickets.status IN ('paid', 'boarded')
  ),
  updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_trip_status ON tickets(trip_id, status) WHERE status IN ('paid', 'boarded');
CREATE INDEX IF NOT EXISTS idx_trips_departure_status ON trips(departure_time, status) WHERE status IN ('scheduled', 'boarding');

