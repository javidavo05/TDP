import { NextRequest, NextResponse } from "next/server";
import { getYappyButtonPaymentService } from "@/services/yappy/YappyButtonPaymentService";
import { PaymentRepository } from "@/infrastructure/db/supabase/PaymentRepository";
import { TicketRepository } from "@/infrastructure/db/supabase/TicketRepository";

const paymentRepository = new PaymentRepository();
const ticketRepository = new TicketRepository();

/**
 * IPN (Instant Payment Notification) endpoint para el Botón de Pago Yappy
 * Este endpoint recibe notificaciones cuando se completa un pago
 * 
 * Parámetros GET:
 * - orderId: ID de la orden
 * - status: Estado del pago (APPROVED, REJECTED, etc.)
 * - domain: Dominio configurado
 * - hash: Hash de validación HMAC SHA-256
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get("orderId");
    const status = searchParams.get("status");
    const domain = searchParams.get("domain");
    const hash = searchParams.get("hash");

    if (!orderId || !status || !domain || !hash) {
      return NextResponse.json(
        { error: "orderId, status, domain y hash son requeridos" },
        { status: 400 }
      );
    }

    // Validar el hash
    const service = getYappyButtonPaymentService();
    const isValid = service.validateIPNHash(orderId, status, domain, hash);

    if (!isValid) {
      console.error("Invalid hash for Yappy IPN:", { orderId, status, domain });
      return NextResponse.json(
        { error: "Hash de validación inválido" },
        { status: 401 }
      );
    }

    // Si el hash es válido, procesar el pago
    if (status === "APPROVED") {
      console.log("Yappy payment approved:", { orderId, status, domain });
      
      // Buscar el pago por orderId en metadata
      // El orderId se guarda en payment.metadata.yappyOrderId cuando se crea la orden
      try {
        // Buscar pagos con este orderId en metadata
        // Nota: Esto requiere una búsqueda en la base de datos por metadata
        // Por ahora, el sistema puede verificar el estado consultando la API de Yappy
        
        // Actualizar el ticket si encontramos el pago asociado
        // Esto se puede hacer mejorando el PaymentRepository para buscar por metadata
        console.log("Processing approved payment for orderId:", orderId);
      } catch (error) {
        console.error("Error processing approved payment:", error);
      }
    } else if (status === "REJECTED") {
      console.log("Yappy payment rejected:", { orderId, status, domain });
    }

    return NextResponse.json({
      success: true,
      orderId,
      status,
    });
  } catch (error) {
    console.error("Error processing Yappy IPN:", error);
    return NextResponse.json(
      {
        error: (error as Error).message || "Error al procesar notificación de Yappy",
      },
      { status: 500 }
    );
  }
}

