import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { POSService } from "@/services/pos/POSService";
import { TicketRepository } from "@/infrastructure/db/supabase/TicketRepository";
import { PaymentRepository } from "@/infrastructure/db/supabase/PaymentRepository";
import { POSCashSessionRepository } from "@/infrastructure/db/supabase/POSCashSessionRepository";
import { POSTransactionRepository } from "@/infrastructure/db/supabase/POSTransactionRepository";

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

export async function POST(request: NextRequest) {
  try {
    const { user } = await checkAuth();
    const body = await request.json();
    
    const {
      tripId,
      seatId,
      passengerName,
      passengerPhone,
      passengerEmail,
      passengerDocumentId,
      passengerDocumentType,
      destinationStopId,
      boardingStopId,
      paymentMethod,
      amount,
      terminalId,
      sessionId,
      receivedAmount,
    } = body;

    // Validate required fields
    if (!tripId || !seatId || !passengerName || !destinationStopId || !paymentMethod || !amount || !terminalId || !sessionId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // For cash payments, receivedAmount is required
    if (paymentMethod === "cash" && (!receivedAmount || receivedAmount < amount)) {
      return NextResponse.json(
        { error: "receivedAmount is required for cash payments and must be >= amount" },
        { status: 400 }
      );
    }

    const { ticket, payment, transaction } = await posService.processSale({
      tripId,
      seatId,
      passengerName,
      passengerPhone,
      passengerEmail,
      passengerDocumentId,
      passengerDocumentType,
      destinationStopId,
      boardingStopId,
      paymentMethod,
      amount,
      terminalId,
      sessionId,
      receivedAmount,
      processedByUserId: user.id,
    });

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
        changeAmount: payment.changeAmount,
      },
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        changeAmount: transaction.changeAmount,
      },
    });
  } catch (error: any) {
    console.error("Error processing POS sale:", error);
    return NextResponse.json(
      { error: error.message || "Error al procesar la venta" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 401 : 500 }
    );
  }
}

