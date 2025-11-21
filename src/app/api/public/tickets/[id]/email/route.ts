import { NextRequest, NextResponse } from "next/server";
import { TicketRepository } from "@/infrastructure/db/supabase/TicketRepository";
import { TripRepository } from "@/infrastructure/db/supabase/TripRepository";
import { RouteRepository } from "@/infrastructure/db/supabase/RouteRepository";
import { EmailService } from "@/services/email/EmailService";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

const ticketRepository = new TicketRepository();
const tripRepository = new TripRepository();
const routeRepository = new RouteRepository();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id;
    
    // Get ticket
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket no encontrado" },
        { status: 404 }
      );
    }

    if (!ticket.passengerEmail) {
      return NextResponse.json(
        { error: "El ticket no tiene un email asociado" },
        { status: 400 }
      );
    }

    // Get trip information
    const trip = await tripRepository.findById(ticket.tripId);
    if (!trip) {
      return NextResponse.json(
        { error: "Viaje no encontrado" },
        { status: 404 }
      );
    }

    // Get route information
    const route = await routeRepository.findById(trip.routeId);
    if (!route) {
      return NextResponse.json(
        { error: "Ruta no encontrada" },
        { status: 404 }
      );
    }

    // Get seat information
    const supabase = await createClient();
    const { data: seatData } = await supabase
      .from("seats")
      .select("seat_number")
      .eq("id", ticket.seatId)
      .single();

    // Get payment information
    const { data: paymentData } = await supabase
      .from("payments")
      .select("amount, itbms, total_amount, payment_method")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Send email
    const emailService = new EmailService();
    await emailService.sendTicketConfirmation(
      ticket,
      {
        id: trip.id,
        departureTime: trip.departureTime,
        arrivalEstimate: trip.arrivalEstimate,
        route: {
          origin: route.origin,
          destination: route.destination,
        },
      },
      {
        id: ticket.seatId,
        number: seatData?.seat_number || "N/A",
      },
      {
        amount: paymentData?.amount ? parseFloat(paymentData.amount) : ticket.price,
        itbms: paymentData?.itbms ? parseFloat(paymentData.itbms) : ticket.itbms,
        totalAmount: paymentData?.total_amount ? parseFloat(paymentData.total_amount) : ticket.totalPrice,
        method: paymentData?.payment_method || "unknown",
      }
    );

    return NextResponse.json({
      success: true,
      message: "Email enviado exitosamente",
    });
  } catch (error) {
    console.error("Error sending ticket email:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Error al enviar el email" },
      { status: 500 }
    );
  }
}

