import { Ticket } from "@/domain/entities";

interface TicketData {
  ticket: Ticket;
  trip: {
    id: string;
    departureTime: Date;
    arrivalEstimate?: Date | null;
    route: {
      origin: string;
      destination: string;
    };
  };
  seat: {
    id: string;
    number: string;
  };
}

interface PaymentData {
  amount: number;
  itbms: number;
  totalAmount: number;
  method: string;
}

interface MultipleTicketsConfirmationEmailProps {
  tickets: TicketData[];
  payment: PaymentData;
}

export async function MultipleTicketsConfirmationEmail({
  tickets,
  payment,
}: MultipleTicketsConfirmationEmailProps): Promise<string> {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("es-PA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PA", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const firstTicket = tickets[0];
  const route = firstTicket.trip.route;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Boletos</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2563eb;
      margin: 0;
      font-size: 28px;
    }
    .ticket {
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      background-color: #f9fafb;
    }
    .ticket-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 1px solid #e5e7eb;
    }
    .ticket-number {
      font-size: 18px;
      font-weight: bold;
      color: #2563eb;
    }
    .qr-code {
      text-align: center;
      margin: 20px 0;
      padding: 15px;
      background-color: #ffffff;
      border-radius: 4px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .info-label {
      font-weight: 600;
      color: #6b7280;
    }
    .info-value {
      color: #111827;
      font-weight: 500;
    }
    .summary {
      background-color: #f0f9ff;
      border: 2px solid #2563eb;
      border-radius: 8px;
      padding: 20px;
      margin-top: 30px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 16px;
    }
    .summary-total {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
      border-top: 2px solid #2563eb;
      padding-top: 10px;
      margin-top: 10px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      background-color: #dbeafe;
      color: #1e40af;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Confirmación de Boletos</h1>
      <p style="color: #6b7280; margin: 10px 0 0 0;">
        ${tickets.length} ${tickets.length === 1 ? "boleto" : "boletos"} confirmado${tickets.length === 1 ? "" : "s"}
      </p>
    </div>

    ${tickets.map((ticketData, index) => `
      <div class="ticket">
        <div class="ticket-header">
          <div>
            <div class="ticket-number">Boleto #${index + 1}</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
              ${ticketData.ticket.qrCode}
            </div>
          </div>
          <span class="badge">Confirmado</span>
        </div>

        <div class="info-row">
          <span class="info-label">Pasajero:</span>
          <span class="info-value">${ticketData.ticket.passengerName}</span>
        </div>

        <div class="info-row">
          <span class="info-label">Ruta:</span>
          <span class="info-value">${route.origin} → ${route.destination}</span>
        </div>

        <div class="info-row">
          <span class="info-label">Asiento:</span>
          <span class="info-value">${ticketData.seat.number}</span>
        </div>

        <div class="info-row">
          <span class="info-label">Fecha y Hora de Salida:</span>
          <span class="info-value">${formatDate(ticketData.trip.departureTime)}</span>
        </div>

        ${ticketData.trip.arrivalEstimate ? `
          <div class="info-row">
            <span class="info-label">Hora Estimada de Llegada:</span>
            <span class="info-value">${formatDate(ticketData.trip.arrivalEstimate)}</span>
          </div>
        ` : ""}

        <div class="qr-code">
          <div style="font-weight: 600; margin-bottom: 10px; color: #6b7280;">Código QR:</div>
          <div style="font-family: monospace; font-size: 16px; letter-spacing: 2px; color: #111827;">
            ${ticketData.ticket.qrCode}
          </div>
        </div>
      </div>
    `).join("")}

    <div class="summary">
      <h2 style="margin: 0 0 15px 0; color: #2563eb; font-size: 20px;">Resumen de Pago</h2>
      
      <div class="summary-row">
        <span>Subtotal (${tickets.length} ${tickets.length === 1 ? "boleto" : "boletos"}):</span>
        <span>${formatCurrency(payment.amount)}</span>
      </div>

      <div class="summary-row">
        <span>ITBMS (7%):</span>
        <span>${formatCurrency(payment.itbms)}</span>
      </div>

      <div class="summary-row summary-total">
        <span>Total Pagado:</span>
        <span>${formatCurrency(payment.totalAmount)}</span>
      </div>

      <div class="summary-row" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #bfdbfe;">
        <span style="color: #6b7280; font-size: 14px;">Método de Pago:</span>
        <span style="color: #6b7280; font-size: 14px;">${payment.method}</span>
      </div>
    </div>

    <div class="footer">
      <p><strong>Importante:</strong></p>
      <p>Presenta este correo o el código QR en el terminal de embarque.</p>
      <p style="margin-top: 20px;">
        Si tienes alguna pregunta, contáctanos a través de nuestros canales oficiales.
      </p>
      <p style="margin-top: 10px; font-size: 12px;">
        Este es un correo automático, por favor no respondas.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

