import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TicketingService } from "@/services/public/ticketing/TicketingService";
import { TicketRepository } from "@/infrastructure/db/supabase/TicketRepository";
import { TripRepository } from "@/infrastructure/db/supabase/TripRepository";

export const dynamic = 'force-dynamic';

const ticketRepository = new TicketRepository();
const tripRepository = new TripRepository();
const ticketingService = new TicketingService(ticketRepository, tripRepository);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: tripId } = params;

    if (!tripId) {
      return NextResponse.json({ error: "Trip ID is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch trip details to get bus_id and seat_map
    const { data: tripData, error: tripError } = await supabase
      .from("trips")
      .select("id, bus_id, total_seats, available_seats, buses(seat_map)")
      .eq("id", tripId)
      .single();

    if (tripError || !tripData) {
      console.error("Error fetching trip for seat availability:", tripError);
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const busSeatMap = (tripData.buses as any)?.seat_map;
    if (!busSeatMap || !busSeatMap.seats) {
      return NextResponse.json({ error: "Bus seat map not found for this trip" }, { status: 404 });
    }

    // Fetch tickets for this trip to determine occupied seats
    const { data: ticketsData, error: ticketsError } = await supabase
      .from("tickets")
      .select("seat_id")
      .eq("trip_id", tripId)
      .in("status", ["paid", "boarded"]); // Consider paid and boarded as occupied

    if (ticketsError) {
      console.error("Error fetching tickets for seat availability:", ticketsError);
      return NextResponse.json({ error: "Failed to fetch occupied seats" }, { status: 500 });
    }

    const occupiedSeatIds = new Set(ticketsData.map((ticket) => ticket.seat_id));

    const seatsWithAvailability = busSeatMap.seats.map((seat: any) => ({
      ...seat,
      isAvailable: !occupiedSeatIds.has(seat.id),
    }));

    return NextResponse.json({
      tripId: tripData.id,
      totalSeats: tripData.total_seats,
      availableSeats: tripData.available_seats,
      occupiedSeats: occupiedSeatIds.size,
      seats: seatsWithAvailability,
      occupiedSeatIds: Array.from(occupiedSeatIds), // Include as array for easier use
      busElements: busSeatMap.busElements || [],
      freeSpaces: busSeatMap.freeSpaces || [],
    });
  } catch (error) {
    console.error("Error in GET /api/public/trips/[id]/seats:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch seat availability" },
      { status: 500 }
    );
  }
}

