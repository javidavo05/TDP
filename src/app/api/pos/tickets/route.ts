import { NextRequest, NextResponse } from "next/server";
import { POSService } from "@/services/pos/POSService";
import { TicketRepository } from "@/infrastructure/db/supabase/TicketRepository";
import { PaymentRepository } from "@/infrastructure/db/supabase/PaymentRepository";

const posService = new POSService(
  new TicketRepository(),
  new PaymentRepository()
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticket, payment } = await posService.processSale(body);

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        qrCode: ticket.qrCode,
        passengerName: ticket.passengerName,
        seatId: ticket.seatId,
        status: ticket.status,
      },
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
      },
    });
  } catch (error: any) {
    console.error("Error processing POS sale:", error);
    return NextResponse.json(
      { error: error.message || "Error al procesar la venta" },
      { status: 500 }
    );
  }
}

