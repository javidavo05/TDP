import { NextRequest, NextResponse } from "next/server";
import { TicketRepository } from "@/infrastructure/db/supabase/TicketRepository";
import { TripRepository } from "@/infrastructure/db/supabase/TripRepository";
import { TicketingService } from "@/services/public/ticketing/TicketingService";
import { createClient } from "@/lib/supabase/server";

const ticketRepository = new TicketRepository();
const tripRepository = new TripRepository();
const ticketingService = new TicketingService(ticketRepository, tripRepository);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const ticket = await ticketingService.cancelTicket(params.id, user.id);

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Error cancelling ticket:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to cancel ticket" },
      { status: 400 }
    );
  }
}

