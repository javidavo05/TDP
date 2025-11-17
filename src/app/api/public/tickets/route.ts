import { NextRequest, NextResponse } from "next/server";
import { TicketRepository } from "@/infrastructure/db/supabase/TicketRepository";
import { TripRepository } from "@/infrastructure/db/supabase/TripRepository";
import { TicketingService } from "@/services/public/ticketing/TicketingService";
import { createClient } from "@/lib/supabase/server";

const ticketRepository = new TicketRepository();
const tripRepository = new TripRepository();
const ticketingService = new TicketingService(ticketRepository, tripRepository);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tripId,
      seatId,
      passengerName,
      destinationStopId,
      price,
      passengerPhone,
      passengerEmail,
      boardingStopId,
    } = body;

    // Get user if authenticated
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const ticket = await ticketingService.createTicket({
      tripId,
      seatId,
      passengerName,
      destinationStopId,
      price,
      userId: user?.id,
      passengerPhone,
      passengerEmail,
      boardingStopId,
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to create ticket" },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    const result = await ticketingService.getUserTickets(user.id, { page, limit, offset });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

