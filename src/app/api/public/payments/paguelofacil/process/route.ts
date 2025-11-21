import { NextRequest, NextResponse } from "next/server";
import { PagueloFacilProvider } from "@/infrastructure/payments/paguelofacil/PagueloFacilProvider";
import { PaymentRepository } from "@/infrastructure/db/supabase/PaymentRepository";
import { TicketRepository } from "@/infrastructure/db/supabase/TicketRepository";
import { Payment } from "@/domain/entities";
import { calculateITBMS } from "@/lib/constants";
import { validateCardNumber, validateExpiryDate, validateCVV, detectCardType } from "@/lib/card-detector";

const paymentRepository = new PaymentRepository();
const ticketRepository = new TicketRepository();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ticketId,
      cardNumber,
      expiryMonth,
      expiryYear,
      cvv,
      cardholderName,
      amount,
      description,
    } = body;

    // Validaciones básicas
    if (!ticketId) {
      return NextResponse.json(
        { error: "ticketId es requerido" },
        { status: 400 }
      );
    }

    if (!cardNumber || !expiryMonth || !expiryYear || !cvv || !cardholderName) {
      return NextResponse.json(
        { error: "Todos los campos de la tarjeta son requeridos" },
        { status: 400 }
      );
    }

    // Validar número de tarjeta
    if (!validateCardNumber(cardNumber)) {
      return NextResponse.json(
        { error: "Número de tarjeta inválido" },
        { status: 400 }
      );
    }

    // Validar fecha de expiración
    const expiryStr = `${String(expiryMonth).padStart(2, "0")}${String(expiryYear).slice(-2)}`;
    if (!validateExpiryDate(expiryStr)) {
      return NextResponse.json(
        { error: "Fecha de expiración inválida o vencida" },
        { status: 400 }
      );
    }

    // Validar CVV
    const cardType = detectCardType(cardNumber);
    if (!validateCVV(cvv, cardType)) {
      return NextResponse.json(
        { error: "CVV inválido" },
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

    // Calcular ITBMS
    const itbms = calculateITBMS(amount || ticket.price);

    // Procesar pago con PagueloFacil
    const provider = new PagueloFacilProvider();
    const paymentResult = await provider.processCardPayment({
      cardNumber: cardNumber.replace(/\s/g, ""),
      expiryMonth,
      expiryYear,
      cvv,
      cardholderName,
      amount: amount || ticket.price,
      itbms,
      description: description || `Boleto TDP - ${ticket.passengerName}`,
      customerInfo: {
        name: ticket.passengerName,
        email: ticket.passengerEmail || undefined,
        phone: ticket.passengerPhone || undefined,
      },
      metadata: {
        ticketId: ticket.id,
        qrCode: ticket.qrCode,
      },
    });

    if (paymentResult.status === "failed") {
      return NextResponse.json(
        { error: paymentResult.error || "Error al procesar el pago con PagueloFacil" },
        { status: 500 }
      );
    }

    // Crear registro de pago
    const payment = Payment.create({
      ticketId: ticket.id,
      paymentMethod: "paguelofacil",
      amount: amount || ticket.price,
      itbms,
    });

    if (paymentResult.status === "completed") {
      payment.markAsCompleted(paymentResult.transactionId, paymentResult.metadata);
    } else {
      payment.markAsProcessing();
    }

    const createdPayment = await paymentRepository.create(payment);

    // Si el pago fue completado, actualizar el ticket
    if (paymentResult.status === "completed") {
      await ticketRepository.update(ticket.id, {
        status: "paid" as any,
      });
    }

    // Actualizar metadata del pago
    await paymentRepository.update(createdPayment.id, {
      metadata: {
        ...createdPayment.metadata,
        paguelofacilTransactionId: paymentResult.transactionId,
        paguelofacilMetadata: paymentResult.metadata,
      },
    });

    return NextResponse.json({
      payment: {
        ...createdPayment,
        metadata: {
          ...createdPayment.metadata,
          paguelofacilTransactionId: paymentResult.transactionId,
          paguelofacilMetadata: paymentResult.metadata,
        },
      },
      transactionId: paymentResult.transactionId,
      status: paymentResult.status,
      message: paymentResult.status === "completed" 
        ? "Pago procesado exitosamente" 
        : "Pago en proceso",
    });
  } catch (error) {
    console.error("Error processing PagueloFacil card payment:", error);
    return NextResponse.json(
      {
        error: (error as Error).message || "Error al procesar el pago con tarjeta",
      },
      { status: 500 }
    );
  }
}

