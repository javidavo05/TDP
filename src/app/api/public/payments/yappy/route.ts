import { NextRequest, NextResponse } from "next/server";
import { YappyComercialProvider } from "@/infrastructure/payments/yappy/YappyComercialProvider";
import { PaymentRepository } from "@/infrastructure/db/supabase/PaymentRepository";
import { TicketRepository } from "@/infrastructure/db/supabase/TicketRepository";
import { Payment } from "@/domain/entities";

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

    // Iniciar pago con Yappy usando el Botón de Pago
    const provider = new YappyComercialProvider();
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
        { error: paymentResult.error || "Error al iniciar pago con Yappy" },
        { status: 500 }
      );
    }

    // Crear registro de pago
    const payment = Payment.create({
      ticketId: ticket.id,
      paymentMethod: "yappy",
      amount: ticket.price,
      itbms: ticket.itbms,
    });

    payment.markAsProcessing();
    const createdPayment = await paymentRepository.create(payment);

    // Actualizar metadata del pago con orderId de Yappy
    const orderId = paymentResult.metadata?.orderId as string || paymentResult.transactionId;
    await paymentRepository.update(createdPayment.id, {
      metadata: {
        ...createdPayment.metadata,
        yappyOrderId: orderId,
        yappyTransactionId: paymentResult.transactionId,
        yappyMetadata: paymentResult.metadata,
      },
    });

    return NextResponse.json({
      payment: {
        ...createdPayment,
        metadata: {
          ...createdPayment.metadata,
          yappyOrderId: orderId,
          yappyTransactionId: paymentResult.transactionId,
          yappyMetadata: paymentResult.metadata,
        },
      },
      yappyPayment: paymentResult,
      orderId: orderId, // Para el componente del botón
      message: "Orden creada. Usa el botón de Yappy para completar el pago.",
    });
  } catch (error) {
    console.error("Error processing Yappy payment:", error);
    return NextResponse.json(
      {
        error: (error as Error).message || "Error al procesar pago con Yappy",
      },
      { status: 500 }
    );
  }
}

