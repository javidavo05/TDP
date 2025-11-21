import QRCode from "qrcode";
import { Ticket } from "@/domain/entities";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface TripData {
  id: string;
  departureTime: Date;
  arrivalEstimate?: Date | null;
  route: {
    origin: string;
    destination: string;
  };
}

interface SeatData {
  id: string;
  number: string;
}

interface PaymentData {
  amount: number;
  itbms: number;
  totalAmount: number;
  method: string;
}

interface TicketConfirmationEmailProps {
  ticket: Ticket;
  trip: TripData;
  seat: SeatData;
  payment: PaymentData;
}

export async function TicketConfirmationEmail({
  ticket,
  trip,
  seat,
  payment,
}: TicketConfirmationEmailProps): Promise<string> {
  // Generate QR code as base64
  const qrCodeDataURL = await QRCode.toDataURL(ticket.qrCode, {
    width: 200,
    margin: 2,
    color: {
      dark: "#1e40af", // Primary blue
      light: "#ffffff",
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PA", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    return format(d, "EEEE, d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es });
  };

  const departureTime = trip.departureTime instanceof Date ? trip.departureTime : new Date(trip.departureTime);
  const arrivalTime = trip.arrivalEstimate
    ? trip.arrivalEstimate instanceof Date
      ? trip.arrivalEstimate
      : new Date(trip.arrivalEstimate)
    : null;

  const getPaymentMethodName = (method: string): string => {
    const methods: Record<string, string> = {
      yappy: "Yappy",
      paguelofacil: "PagueloFacil",
      tilopay: "Tilopay",
      payu: "PayU",
      banesco: "Banesco",
      cash: "Efectivo",
      card: "Tarjeta",
    };
    return methods[method] || method;
  };

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Boleto - TDP</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">✓ Boleto Confirmado</h1>
              <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 16px;">Tu viaje está reservado</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #1f2937; font-size: 16px; line-height: 1.6;">
                Hola <strong>${ticket.passengerName}</strong>,
              </p>
              <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Tu boleto ha sido confirmado exitosamente. Aquí están los detalles de tu viaje:
              </p>

              <!-- Trip Details Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 24px;">
                    <div style="text-align: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #3b82f6;">
                      <div style="font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 8px;">${trip.route.origin}</div>
                      <div style="font-size: 20px; color: #3b82f6; margin: 8px 0;">↓</div>
                      <div style="font-size: 24px; font-weight: 700; color: #1f2937;">${trip.route.destination}</div>
                    </div>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 12px 0; color: #6b7280; font-size: 14px; width: 140px;">Fecha de Salida:</td>
                        <td style="padding: 12px 0; color: #1f2937; font-size: 16px; font-weight: 600;">${formatDate(departureTime)}</td>
                      </tr>
                      ${arrivalTime ? `
                      <tr>
                        <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Llegada Estimada:</td>
                        <td style="padding: 12px 0; color: #1f2937; font-size: 16px;">${formatDate(arrivalTime)}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Asiento:</td>
                        <td style="padding: 12px 0; color: #1f2937; font-size: 16px; font-weight: 600;">${seat.number}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Código de Boleto:</td>
                        <td style="padding: 12px 0; color: #1f2937; font-size: 14px; font-family: monospace;">${ticket.qrCode}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- QR Code -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td align="center" style="padding: 30px; background-color: #f9fafb; border-radius: 8px;">
                    <p style="margin: 0 0 20px; color: #1f2937; font-size: 16px; font-weight: 600;">Tu Código QR</p>
                    <img src="${qrCodeDataURL}" alt="QR Code" style="width: 200px; height: 200px; border: 4px solid #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); display: block; margin: 0 auto;" />
                    <p style="margin: 15px 0 0; color: #6b7280; font-size: 12px; font-family: monospace;">${ticket.qrCode}</p>
                    <p style="margin: 15px 0 0; color: #6b7280; font-size: 14px;">Presenta este código QR al abordar el bus</p>
                  </td>
                </tr>
              </table>

              <!-- Payment Details -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="margin: 0 0 16px; color: #ffffff; font-size: 18px; font-weight: 600;">Resumen de Pago</h3>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #e0e7ff; font-size: 14px;">Precio Base:</td>
                        <td align="right" style="padding: 8px 0; color: #ffffff; font-size: 14px;">${formatCurrency(payment.amount)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #e0e7ff; font-size: 14px;">ITBMS (7%):</td>
                        <td align="right" style="padding: 8px 0; color: #ffffff; font-size: 14px;">${formatCurrency(payment.itbms)}</td>
                      </tr>
                      <tr style="border-top: 2px solid rgba(255, 255, 255, 0.3);">
                        <td style="padding: 12px 0 0; color: #ffffff; font-size: 18px; font-weight: 600;">Total Pagado:</td>
                        <td align="right" style="padding: 12px 0 0; color: #ffffff; font-size: 24px; font-weight: 700;">${formatCurrency(payment.totalAmount)} USD</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 12px; color: #e0e7ff; font-size: 12px;">Método de pago: ${getPaymentMethodName(payment.method)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Instructions -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin-bottom: 30px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  <strong>📋 Instrucciones importantes:</strong><br>
                  • Presenta este código QR al abordar el bus<br>
                  • Llega al menos 15 minutos antes de la hora de salida<br>
                  • Guarda este email para referencia
                </p>
              </div>

              <!-- Support -->
              <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;"><strong>¿Necesitas ayuda?</strong></p>
                <p style="margin: 0 0 4px; color: #6b7280; font-size: 14px;">Contáctanos en <a href="mailto:soporte@pimetransport.com" style="color: #3b82f6; text-decoration: none;">soporte@pimetransport.com</a></p>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Teléfono: +507 6000-0000</p>
              </div>
            </td>
          </tr>

          <!-- Footer Bar -->
          <tr>
            <td style="padding: 20px 40px; background-color: #1f2937; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0 0 8px; color: #ffffff; font-size: 14px; font-weight: 600;">TDP Ticketing System</p>
              <p style="margin: 0 0 8px; color: #9ca3af; font-size: 12px;">Tu plataforma de confianza para viajar por Panamá</p>
              <p style="margin: 16px 0 0; color: #6b7280; font-size: 11px;">
                Este es un email automático, por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
