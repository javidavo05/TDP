import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/services/public/payments/PaymentService";
import { PaymentRepository } from "@/infrastructure/db/supabase/PaymentRepository";
import { TicketRepository } from "@/infrastructure/db/supabase/TicketRepository";
import { PaymentProviderFactory } from "@/infrastructure/payments/PaymentProviderFactory";

const paymentRepository = new PaymentRepository();
const ticketRepository = new TicketRepository();
const paymentService = new PaymentService(
  paymentRepository,
  ticketRepository,
  PaymentProviderFactory.getAllProviders()
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payment = await paymentService.processCallback("paguelofacil", body);
    return NextResponse.json({ payment, success: true });
  } catch (error) {
    console.error("Error processing PagueloFacil webhook:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to process webhook" },
      { status: 400 }
    );
  }
}

