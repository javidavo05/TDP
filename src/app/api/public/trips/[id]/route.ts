import { NextRequest, NextResponse } from "next/server";
import { TripRepository } from "@/infrastructure/db/supabase/TripRepository";
import { TicketingService } from "@/services/public/ticketing/TicketingService";
import { TicketRepository } from "@/infrastructure/db/supabase/TicketRepository";
import { createClient } from "@/lib/supabase/server";

const tripRepository = new TripRepository();
const ticketRepository = new TicketRepository();
const ticketingService = new TicketingService(ticketRepository, tripRepository);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trip = await ticketingService.getTripById(params.id);
    
    if (!trip) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 }
      );
    }

    // Enrich trip with route and bus information
    const supabase = await createClient();
    
    // Fetch route information
    const { data: routeData } = await supabase
      .from("routes")
      .select("id, name, origin, destination, base_price, estimated_duration_minutes")
      .eq("id", trip.routeId)
      .single();

    // Fetch bus information
    const { data: busData } = await supabase
      .from("buses")
      .select("id, bus_class, features, seat_map, capacity")
      .eq("id", trip.busId)
      .single();

    // Calculate arrival time if not set
    let arrivalTime = trip.arrivalEstimate?.toISOString() || null;
    if (!arrivalTime && routeData?.estimated_duration_minutes) {
      const estimatedArrival = new Date(trip.departureTime);
      estimatedArrival.setMinutes(
        estimatedArrival.getMinutes() + routeData.estimated_duration_minutes
      );
      arrivalTime = estimatedArrival.toISOString();
    }

    // Return enriched trip data matching the POS interface
    const enrichedTrip = {
      id: trip.id,
      departureTime: trip.departureTime.toISOString(),
      arrivalTime: arrivalTime,
      price: trip.price,
      availableSeats: trip.availableSeats,
      totalSeats: trip.totalSeats,
      route: {
        id: routeData?.id || "",
        name: routeData?.name || "",
        origin: routeData?.origin || "",
        destination: routeData?.destination || "",
      },
      bus: {
        id: busData?.id || "",
        seatMap: busData?.seat_map || { seats: [] },
        capacity: busData?.capacity || trip.totalSeats,
      },
    };

    return NextResponse.json({ trip: enrichedTrip });
  } catch (error) {
    console.error("Error fetching trip:", error);
    return NextResponse.json(
      { error: "Failed to fetch trip" },
      { status: 500 }
    );
  }
}

