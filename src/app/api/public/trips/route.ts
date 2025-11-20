import { NextRequest, NextResponse } from "next/server";
import { TripRepository } from "@/infrastructure/db/supabase/TripRepository";
import { TicketingService } from "@/services/public/ticketing/TicketingService";
import { TicketRepository } from "@/infrastructure/db/supabase/TicketRepository";
import { TripSearchFilters } from "@/domain/types";

export const dynamic = 'force-dynamic';

const tripRepository = new TripRepository();
const ticketRepository = new TicketRepository();
const ticketingService = new TicketingService(ticketRepository, tripRepository);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const filters: TripSearchFilters = {
      origin: searchParams.get("origin") || undefined,
      destination: searchParams.get("destination") || undefined,
      date: searchParams.get("date") ? new Date(searchParams.get("date")!) : undefined,
      minPrice: searchParams.get("minPrice") ? parseFloat(searchParams.get("minPrice")!) : undefined,
      maxPrice: searchParams.get("maxPrice") ? parseFloat(searchParams.get("maxPrice")!) : undefined,
      busClass: searchParams.get("busClass") as any,
    };

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    const result = await ticketingService.searchTrips(filters, { page, limit, offset });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error searching trips:", error);
    return NextResponse.json(
      { error: "Failed to search trips" },
      { status: 500 }
    );
  }
}

