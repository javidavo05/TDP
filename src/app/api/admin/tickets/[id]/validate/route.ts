import { NextRequest, NextResponse } from "next/server";
import { TicketRepository } from "@/infrastructure/db/supabase/TicketRepository";
import { createClient } from "@/lib/supabase/server";

const ticketRepository = new TicketRepository();

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is assistant or admin
    const userData = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!["assistant", "admin"].includes(userData.data?.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ticket = await ticketRepository.findById(params.id);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.status !== "paid") {
      return NextResponse.json(
        { error: `Ticket is ${ticket.status}, cannot validate` },
        { status: 400 }
      );
    }

    ticket.markAsBoarded();
    const updatedTicket = await ticketRepository.update(ticket.id, {
      status: ticket.status,
      boardedAt: ticket.boardedAt,
      passengerName: ticket.passengerName,
      passengerPhone: ticket.passengerPhone,
      passengerEmail: ticket.passengerEmail,
    });

    // Create trip manifest entry if passenger_id exists
    if (updatedTicket.passengerId) {
      const supabase = await createClient();
      await supabase.from("trip_manifest").insert({
        trip_id: updatedTicket.tripId,
        ticket_id: updatedTicket.id,
        passenger_id: updatedTicket.passengerId,
        validated_by: user.id,
      });
    }

    return NextResponse.json({ ticket: updatedTicket, success: true });
  } catch (error) {
    console.error("Error validating ticket:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to validate ticket" },
      { status: 500 }
    );
  }
}

