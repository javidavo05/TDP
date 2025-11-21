import { NextRequest, NextResponse } from "next/server";
import { YappyComercialProvider } from "@/infrastructure/payments/yappy/YappyComercialProvider";
import { PaymentRepository } from "@/infrastructure/db/supabase/PaymentRepository";
import { TicketRepository } from "@/infrastructure/db/supabase/TicketRepository";

const paymentRepository = new PaymentRepository();
const ticketRepository = new TicketRepository();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const provider = new YappyComercialProvider();

    // Procesar el callback de Yappy
    const result = await provider.processCallback(body);

    // Si el pago fue completado, actualizar el ticket y el pago
    if (result.status === "completed" && result.transactionId) {
      // Buscar el pago por transactionId en metadata
      // Esto requiere que guardemos el transactionId en el payment.metadata
      // Por ahora, intentamos actualizar basándonos en el transactionId

      // El webhook debería incluir información sobre qué ticket/pago actualizar
      // Esto se puede hacer guardando el ticketId en el metadata del pago inicial
      const ticketId = body.ticketId || body.metadata?.ticketId;

      if (ticketId) {
        const ticket = await ticketRepository.findById(ticketId);
        if (ticket && ticket.status === "pending") {
          await ticketRepository.update(ticket.id, { status: "paid" });
        }

        // Buscar y actualizar el pago
        // Nota: Esto requiere una búsqueda por metadata, que puede necesitar implementación adicional
      }
    }

    return NextResponse.json({
      success: true,
      transactionId: result.transactionId,
      status: result.status,
    });
  } catch (error) {
    console.error("Error processing Yappy webhook:", error);
    return NextResponse.json(
      {
        error: (error as Error).message || "Error al procesar webhook de Yappy",
      },
      { status: 500 }
    );
  }
}

