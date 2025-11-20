import { Resend } from "resend";
import { Ticket } from "@/domain/entities";
import { TicketConfirmationEmail } from "@/templates/email/TicketConfirmationEmail";

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

export class EmailService {
  private resend: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    this.resend = new Resend(apiKey);
  }

  async sendTicketConfirmation(
    ticket: Ticket,
    trip: TripData,
    seat: SeatData,
    payment: PaymentData
  ): Promise<{ id: string } | undefined> {
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@tdp.com";
      const toEmail = ticket.passengerEmail;

      if (!toEmail) {
        console.warn("No email provided for ticket", ticket.id);
        return;
      }

      // Generate email HTML
      const html = await TicketConfirmationEmail({
        ticket,
        trip,
        seat,
        payment,
      });

      const result = await this.resend.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: `Confirmación de Boleto - ${trip.route.origin} → ${trip.route.destination}`,
        html,
      });

      if (result.error) {
        console.error("Resend API error:", result.error);
        throw new Error(`Failed to send email: ${JSON.stringify(result.error)}`);
      }

      console.log(`Email sent successfully to ${toEmail} for ticket ${ticket.id}`);
      console.log(`Email ID: ${result.data?.id || "N/A"}`);
      
      return result.data;
    } catch (error) {
      console.error("Error sending email:", error);
      // Don't throw - email failure shouldn't block the transaction in production
      // But re-throw in test mode so we can see the error
      if (process.env.NODE_ENV === "test" || process.env.DEBUG_EMAIL === "true") {
        throw error;
      }
    }
  }
}
