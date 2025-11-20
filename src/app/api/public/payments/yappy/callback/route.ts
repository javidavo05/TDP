import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/services/public/payments/PaymentService";
import { PaymentRepository } from "@/infrastructure/db/supabase/PaymentRepository";
import { TicketRepository } from "@/infrastructure/db/supabase/TicketRepository";
import { TripRepository } from "@/infrastructure/db/supabase/TripRepository";
import { PaymentProviderFactory } from "@/infrastructure/payments/PaymentProviderFactory";

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

    const payment = await paymentService.processCallback("yappy", body);

    return NextResponse.json({ payment, success: true });
  } catch (error) {
    console.error("Error processing Yappy callback:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to process callback" },
      { status: 400 }
    );
  }
}

