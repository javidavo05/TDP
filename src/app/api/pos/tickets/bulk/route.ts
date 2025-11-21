import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { POSService } from "@/services/pos/POSService";
import { TicketRepository } from "@/infrastructure/db/supabase/TicketRepository";
import { PaymentRepository } from "@/infrastructure/db/supabase/PaymentRepository";
import { POSCashSessionRepository } from "@/infrastructure/db/supabase/POSCashSessionRepository";
import { POSTransactionRepository } from "@/infrastructure/db/supabase/POSTransactionRepository";
import { EmailService } from "@/services/email/EmailService";

export const dynamic = 'force-dynamic';

const ticketRepository = new TicketRepository();
const paymentRepository = new PaymentRepository();
const sessionRepository = new POSCashSessionRepository();
const transactionRepository = new POSTransactionRepository();

const posService = new POSService(
  ticketRepository,
  paymentRepository,
  sessionRepository,
  transactionRepository
);

async function checkAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin" && userData?.role !== "pos_agent") {
    throw new Error("Forbidden");
  }

  return { user, role: userData?.role };
}

interface TicketData {
  tripId: string;
  seatId: string;
  passengerName: string;
  passengerPhone?: string;
  passengerDocumentId: string;
  passengerDocumentType: "cedula" | "pasaporte";
  destinationStopId: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await checkAuth();
    const body = await request.json();
    
    const {
      tickets,
      paymentMethod,
      amount,
      terminalId,
      sessionId,
      receivedAmount,
    } = body;

    // Validate required fields
    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return NextResponse.json(
        { error: "Tickets array is required and must not be empty" },
        { status: 400 }
      );
    }

    if (!paymentMethod || !amount || !terminalId || !sessionId) {
      return NextResponse.json(
        { error: "Missing required fields: paymentMethod, amount, terminalId, sessionId" },
        { status: 400 }
      );
    }

    // Validate each ticket
    for (const ticket of tickets) {
      if (!ticket.tripId || !ticket.seatId || !ticket.passengerName || !ticket.passengerDocumentId) {
        return NextResponse.json(
          { error: "Each ticket must have tripId, seatId, passengerName, and passengerDocumentId" },
          { status: 400 }
        );
      }
    }

    // For cash payments, receivedAmount is required
    if (paymentMethod === "cash" && (!receivedAmount || receivedAmount < amount)) {
      return NextResponse.json(
        { error: "receivedAmount is required for cash payments and must be >= amount" },
        { status: 400 }
      );
    }

    // Calculate price per ticket (assuming all tickets have the same price)
    const pricePerTicket = amount / tickets.length;
    const itbmsPerTicket = (amount * 0.07) / tickets.length;
    const totalWithITBMS = amount * 1.07;
    const receivedAmountPerTicket = paymentMethod === "cash" ? (receivedAmount! / tickets.length) : undefined;

    // Process all tickets in a transaction
    const createdTickets = [];
    const errors = [];
    let transactionId: string | null = null;

    for (const ticketData of tickets) {
      try {
        const { ticket, payment, transaction } = await posService.processSale({
          tripId: ticketData.tripId,
          seatId: ticketData.seatId,
          passengerName: ticketData.passengerName,
          passengerPhone: ticketData.passengerPhone,
          passengerEmail: undefined, // TODO: Add email support
          passengerDocumentId: ticketData.passengerDocumentId,
          passengerDocumentType: ticketData.passengerDocumentType,
          destinationStopId: ticketData.destinationStopId || "",
          boardingStopId: undefined,
          paymentMethod,
          amount: pricePerTicket, // Price per ticket (without ITBMS)
          terminalId,
          sessionId,
          receivedAmount: receivedAmountPerTicket,
          processedByUserId: user.id,
        });

        if (!transactionId) {
          transactionId = transaction.id;
        }

        createdTickets.push({
          id: ticket.id,
          qrCode: ticket.qrCode,
          passengerName: ticket.passengerName,
          seatId: ticket.seatId,
          status: ticket.status,
        });
      } catch (error: any) {
        errors.push({
          seatId: ticketData.seatId,
          passengerName: ticketData.passengerName,
          error: error.message || "Error creating ticket",
        });
      }
    }

    if (errors.length > 0) {
      // If some tickets failed, return partial success with errors
      return NextResponse.json({
        success: true,
        partial: true,
        tickets: createdTickets,
        errors,
        message: `${createdTickets.length} ticket(s) created, ${errors.length} failed`,
      }, { status: 207 }); // 207 Multi-Status
    }

    // Send email confirmation for all tickets if at least one has an email
    try {
      const supabase = await createClient();
      const tripId = tickets[0].tripId;
      
      // Fetch trip and route information
      const { data: tripData } = await supabase
        .from("trips")
        .select("id, departure_time, arrival_estimate, route_id, buses(seat_map)")
        .eq("id", tripId)
        .single();

      const { data: routeData } = await supabase
        .from("routes")
        .select("id, name, origin, destination, estimated_duration_minutes")
        .eq("id", tripData?.route_id)
        .single();

      // Fetch all created tickets with full details
      const fullTickets = await Promise.all(
        createdTickets.map(async (ticket) => {
          const { data: ticketData } = await supabase
            .from("tickets")
            .select("*")
            .eq("id", ticket.id)
            .single();

          // Find seat number from bus seat map
          const busSeatMap = (tripData?.buses as any)?.seat_map;
          const seat = busSeatMap?.seats?.find((s: any) => s.id === ticket.seatId);

          return {
            ticket: ticketData,
            seat: {
              id: ticket.seatId,
              number: seat?.number || ticket.seatId,
            },
          };
        })
      );

      // Check if any ticket has an email
      const ticketsWithEmail = fullTickets.filter(
        (t) => t.ticket?.passenger_email
      );

      if (ticketsWithEmail.length > 0 && tripData && routeData) {
        const emailService = new EmailService();
        
        // Calculate arrival time
        let arrivalEstimate = tripData.arrival_estimate 
          ? new Date(tripData.arrival_estimate)
          : null;
        if (!arrivalEstimate && routeData.estimated_duration_minutes) {
          arrivalEstimate = new Date(tripData.departure_time);
          arrivalEstimate.setMinutes(
            arrivalEstimate.getMinutes() + routeData.estimated_duration_minutes
          );
        }

        await emailService.sendMultipleTicketsConfirmation(
          fullTickets.map((t) => ({
            ticket: t.ticket as any,
            trip: {
              id: tripData.id,
              departureTime: new Date(tripData.departure_time),
              arrivalEstimate,
              route: {
                origin: routeData.origin,
                destination: routeData.destination,
              },
            },
            seat: t.seat,
          })),
          {
            amount: amount,
            itbms: amount * 0.07,
            totalAmount: totalWithITBMS,
            method: paymentMethod,
          }
        );
      }
    } catch (emailError) {
      console.error("Error sending email confirmation:", emailError);
      // Don't fail the transaction if email fails
    }

    return NextResponse.json({
      success: true,
      tickets: createdTickets,
      transaction: {
        id: transactionId || "unknown",
        amount: totalWithITBMS,
        ticketCount: createdTickets.length,
      },
    });
  } catch (error: any) {
    console.error("Error processing bulk ticket sale:", error);
    return NextResponse.json(
      { error: error.message || "Error al procesar la venta" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 401 : 500 }
    );
  }
}

