import { NextRequest, NextResponse } from "next/server";
import { PagueloFacilProvider } from "@/infrastructure/payments/paguelofacil/PagueloFacilProvider";
import { PaymentRepository } from "@/infrastructure/db/supabase/PaymentRepository";
import { TicketRepository } from "@/infrastructure/db/supabase/TicketRepository";
import { Payment } from "@/domain/entities";
import { calculateITBMS } from "@/lib/constants";

const paymentRepository = new PaymentRepository();
const ticketRepository = new TicketRepository();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId, customerInfo } = body;

    if (!ticketId) {
      return NextResponse.json(
        { error: "ticketId es requerido" },
        { status: 400 }
      );
    }

    // Obtener el ticket
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket no encontrado" },
        { status: 404 }
      );
    }

    if (ticket.status !== "pending") {
      return NextResponse.json(
        { error: `El ticket ya está ${ticket.status}` },
        { status: 400 }
      );
    }

    // Iniciar pago con PagueloFacil
    const provider = new PagueloFacilProvider();
    const paymentResult = await provider.initiatePayment({
      amount: ticket.price,
      itbms: ticket.itbms,
      description: `Boleto TDP - ${ticket.passengerName}`,
      customerInfo: {
        name: customerInfo?.name || ticket.passengerName,
        email: customerInfo?.email || ticket.passengerEmail,
        phone: customerInfo?.phone || ticket.passengerPhone,
      },
      metadata: {
        ticketId: ticket.id,
        qrCode: ticket.qrCode,
      },
    });

    if (paymentResult.status === "failed") {
      return NextResponse.json(
        { error: paymentResult.error || "Error al iniciar pago con PagueloFacil" },
        { status: 500 }
      );
    }

    // Crear registro de pago
    const payment = Payment.create({
      ticketId: ticket.id,
      paymentMethod: "paguelofacil",
      amount: ticket.price,
      itbms: ticket.itbms,
    });

    payment.markAsProcessing();
    const createdPayment = await paymentRepository.create(payment);

    // Actualizar providerResponse con información adicional de PagueloFacil
    const updatedPayment = new Payment(
      createdPayment.id,
      createdPayment.ticketId,
      createdPayment.paymentMethod,
      createdPayment.amount,
      createdPayment.itbms,
      createdPayment.totalAmount,
      createdPayment.status,
      createdPayment.providerTransactionId,
      {
        ...(createdPayment.providerResponse as Record<string, unknown> || {}),
        paguelofacilTransactionId: paymentResult.transactionId,
        paguelofacilMetadata: paymentResult.metadata,
        paymentUrl: paymentResult.metadata?.paymentUrl, // URL para redirigir al usuario
      },
      createdPayment.processedAt,
      createdPayment.posSessionId,
      createdPayment.receivedAmount,
      createdPayment.changeAmount,
      createdPayment.createdAt,
      new Date() // updatedAt
    );
    
    await paymentRepository.update(updatedPayment);

    return NextResponse.json({
      payment: {
        id: updatedPayment.id,
        ticketId: updatedPayment.ticketId,
        paymentMethod: updatedPayment.paymentMethod,
        amount: updatedPayment.amount,
        itbms: updatedPayment.itbms,
        totalAmount: updatedPayment.totalAmount,
        status: updatedPayment.status,
        providerTransactionId: updatedPayment.providerTransactionId,
        providerResponse: updatedPayment.providerResponse,
        processedAt: updatedPayment.processedAt,
        createdAt: updatedPayment.createdAt,
        updatedAt: updatedPayment.updatedAt,
      },
      paguelofacilPayment: paymentResult,
      paymentUrl: paymentResult.metadata?.paymentUrl, // URL para redirigir al usuario a PagueloFacil
      message: "Pago iniciado con PagueloFacil. Redirige al usuario a la URL de pago.",
    });
  } catch (error) {
    console.error("Error processing PagueloFacil payment:", error);
    return NextResponse.json(
      {
        error: (error as Error).message || "Error al procesar pago con PagueloFacil",
      },
      { status: 500 }
    );
  }
}

