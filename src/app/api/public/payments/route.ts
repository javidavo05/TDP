import { NextRequest, NextResponse } from "next/server";
import { PaymentRepository } from "@/infrastructure/db/supabase/PaymentRepository";
import { TicketRepository } from "@/infrastructure/db/supabase/TicketRepository";
import { TripRepository } from "@/infrastructure/db/supabase/TripRepository";
import { PaymentService } from "@/services/public/payments/PaymentService";
import { PaymentProviderFactory } from "@/infrastructure/payments/PaymentProviderFactory";
import { PaymentMethod } from "@/domain/types";

const paymentRepository = new PaymentRepository();
const ticketRepository = new TicketRepository();
const tripRepository = new TripRepository();
const paymentService = new PaymentService(
  paymentRepository,
  ticketRepository,
  tripRepository,
  PaymentProviderFactory.getAllProviders()
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId, paymentMethod, customerInfo } = body;

    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    const payment = await paymentService.processPayment({
      ticketId,
      paymentMethod: paymentMethod as PaymentMethod,
      amount: ticket.price,
      customerInfo: {
        name: ticket.passengerName,
        email: ticket.passengerEmail || undefined,
        phone: ticket.passengerPhone || undefined,
        ...customerInfo,
      },
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to process payment" },
      { status: 400 }
    );
  }
}

