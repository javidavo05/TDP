import { NextRequest, NextResponse } from "next/server";
import { TripRepository } from "@/infrastructure/db/supabase/TripRepository";
import { TicketingService } from "@/services/public/ticketing/TicketingService";
import { TicketRepository } from "@/infrastructure/db/supabase/TicketRepository";

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

    return NextResponse.json({ trip });
  } catch (error) {
    console.error("Error fetching trip:", error);
    return NextResponse.json(
      { error: "Failed to fetch trip" },
      { status: 500 }
    );
  }
}

