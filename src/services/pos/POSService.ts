import { Ticket, Payment } from "@/domain/entities";
import { ITicketRepository, IPaymentRepository } from "@/domain/repositories";
import { PaymentMethod, TicketStatus } from "@/domain/types";
import { PaymentProviderFactory } from "@/infrastructure/payments/PaymentProviderFactory";
import { calculateITBMS, ITBMS_RATE } from "@/lib/constants";

export interface POSSaleData {
  tripId: string;
  seatId: string;
  passengerName: string;
  passengerPhone?: string;
  passengerEmail?: string;
  passengerDocumentId?: string;
  passengerDocumentType?: "cedula" | "pasaporte";
  destinationStopId: string;
  boardingStopId?: string;
  paymentMethod: PaymentMethod;
  amount: number;
  terminalId: string;
}

export class POSService {
  constructor(
    private ticketRepository: ITicketRepository,
    private paymentRepository: IPaymentRepository
  ) {}

  async processSale(data: POSSaleData): Promise<{ ticket: Ticket; payment: Payment }> {
    // Create ticket
    const ticket = await this.ticketRepository.create({
      tripId: data.tripId,
      seatId: data.seatId,
      passengerName: data.passengerName,
      passengerPhone: data.passengerPhone,
      passengerEmail: data.passengerEmail,
      passengerDocumentId: data.passengerDocumentId,
      passengerId: undefined, // Will be set by TicketingService if passenger is created
      destinationStopId: data.destinationStopId,
      boardingStopId: data.boardingStopId,
      price: data.amount,
      status: "pending" as TicketStatus,
      qrCode: this.generateQRCode(),
    });

    // Process payment
    let payment: Payment;
    const itbms = calculateITBMS(data.amount);

    if (data.paymentMethod === "cash") {
      // Cash payment - immediate confirmation
      payment = Payment.create({
        ticketId: ticket.id,
        paymentMethod: "cash",
        amount: data.amount,
        itbms,
      });
      payment.markAsCompleted("pos-cash", { terminalId: data.terminalId });
      payment = await this.paymentRepository.create(payment);

      // Update ticket to paid
      await this.ticketRepository.update(ticket.id, {
        status: "paid" as TicketStatus,
      });
    } else {
      // Online payment - use payment provider
      const provider = PaymentProviderFactory.getProvider(data.paymentMethod);

      payment = Payment.create({
        ticketId: ticket.id,
        paymentMethod: data.paymentMethod,
        amount: data.amount,
        itbms,
      });
      payment.markAsProcessing();
      await this.paymentRepository.create(payment);

      const response = await provider.initiatePayment({
        amount: data.amount,
        itbms,
        description: `POS Ticket ${ticket.qrCode}`,
        customerInfo: {
          name: data.passengerName,
          email: data.passengerEmail,
          phone: data.passengerPhone,
        },
        metadata: {
          ticketId: ticket.id,
          tripId: data.tripId,
          seatId: data.seatId,
          terminalId: data.terminalId,
        },
      });

      if (response.status === "completed") {
        payment.markAsCompleted(response.transactionId, response.metadata);
        await this.ticketRepository.update(ticket.id, {
          status: "paid" as TicketStatus,
        });
      } else if (response.status === "failed") {
        payment.markAsFailed(response.error);
      }

      payment = await this.paymentRepository.update(payment);
    }

    return { ticket, payment };
  }

  async getDailyReport(terminalId: string, date: Date): Promise<{
    totalSales: number;
    totalTickets: number;
    byPaymentMethod: Record<PaymentMethod, number>;
    tickets: Ticket[];
  }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const tickets = await this.ticketRepository.findByTerminalAndDate(
      terminalId,
      startOfDay,
      endOfDay
    );

    const payments = await Promise.all(
      tickets.map((t) => this.paymentRepository.findByTicket(t.id))
    );

    const totalSales = payments.reduce((sum, p) => sum + (p?.amount || 0), 0);
    const byPaymentMethod = payments.reduce((acc, p) => {
      if (p) {
        acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + p.amount;
      }
      return acc;
    }, {} as Record<PaymentMethod, number>);

    return {
      totalSales,
      totalTickets: tickets.length,
      byPaymentMethod,
      tickets,
    };
  }

  private generateQRCode(): string {
    return `TDP-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

