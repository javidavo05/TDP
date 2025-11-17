import { NextResponse } from "next/server";
import { TripRepository } from "@/infrastructure/db/supabase/TripRepository";
import { TicketingService } from "@/services/public/ticketing/TicketingService";
import { TicketRepository } from "@/infrastructure/db/supabase/TicketRepository";

const tripRepository = new TripRepository();
const ticketRepository = new TicketRepository();
const ticketingService = new TicketingService(ticketRepository, tripRepository);

export async function GET() {
  try {
    const trips = await ticketingService.getUpcomingTrips(24);
    return NextResponse.json({ trips });
  } catch (error) {
    console.error("Error fetching upcoming trips:", error);
    return NextResponse.json(
      { error: "Failed to fetch upcoming trips" },
      { status: 500 }
    );
  }
}

