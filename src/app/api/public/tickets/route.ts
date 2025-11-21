import { NextRequest, NextResponse } from "next/server";
import { TicketRepository } from "@/infrastructure/db/supabase/TicketRepository";
import { TripRepository } from "@/infrastructure/db/supabase/TripRepository";
import { PassengerRepository } from "@/infrastructure/db/supabase/PassengerRepository";
import { TicketingService } from "@/services/public/ticketing/TicketingService";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS, createRateLimitHeaders } from "@/middleware/rateLimit";

const ticketRepository = new TicketRepository();
const tripRepository = new TripRepository();
const passengerRepository = new PassengerRepository();
const ticketingService = new TicketingService(ticketRepository, tripRepository, passengerRepository);

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for ticket creation
    const rateLimitResult = rateLimit(request, RATE_LIMITS.ticketCreation);
    if (rateLimitResult.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: createRateLimitHeaders(
            rateLimitResult.remaining,
            rateLimitResult.resetTime,
            RATE_LIMITS.ticketCreation.limit
          ),
        }
      );
    }

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
      passengerDocumentId,
      passengerDocumentType,
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
      passengerDocumentId,
      passengerDocumentType,
    });

    return NextResponse.json(
      { ticket },
      {
        status: 201,
        headers: createRateLimitHeaders(
          rateLimitResult.remaining - 1,
          rateLimitResult.resetTime,
          RATE_LIMITS.ticketCreation.limit
        ),
      }
    );
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
    const searchParams = request.nextUrl.searchParams;
    const qr = searchParams.get("qr");

    // If QR code is provided, search by QR
    if (qr) {
      const ticket = await ticketingService.getTicketByQR(qr);
      if (!ticket) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }
      return NextResponse.json({ ticket });
    }

    // Otherwise, get user tickets
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

    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100); // Max 100 per page
    const offset = (page - 1) * limit;

    const result = await ticketingService.getUserTickets(user.id, { page, limit, offset });

    // Enrich tickets with trip and seat information
    const enrichedTickets = await Promise.all(
      result.data.map(async (ticket) => {
        const trip = await tripRepository.findById(ticket.tripId);
        
        // Get seat info (simplified - would need SeatRepository)
        const seat = { number: "N/A" }; // TODO: Fetch from seats table
        
        // Get route info for origin/destination (simplified)
        const tripInfo = trip
          ? {
              origin: "Origen", // TODO: Get from route
              destination: "Destino", // TODO: Get from route
              departureTime: trip.departureTime,
              arrivalTime: trip.arrivalEstimate,
            }
          : null;

        return {
          ...ticket,
          trip: tripInfo,
          seat,
        };
      })
    );

    return NextResponse.json({
      ...result,
      data: enrichedTickets,
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

