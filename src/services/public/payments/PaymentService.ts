import { Payment, Ticket } from "@/domain/entities";
import { IPaymentRepository, ITicketRepository, ITripRepository } from "@/domain/repositories";
import { IPaymentProvider } from "@/domain/interfaces";
import { PaymentMethod, PaymentStatus, PaymentProviderResponse } from "@/domain/types";
import { calculateITBMS, ITBMS_RATE } from "@/lib/constants";
import { EmailService } from "@/services/email/EmailService";

export class PaymentService {
  private providers: Map<PaymentMethod, IPaymentProvider>;

  private emailService: EmailService | null = null;

  constructor(
    private paymentRepository: IPaymentRepository,
    private ticketRepository: ITicketRepository,
    private tripRepository: ITripRepository,
    providers: IPaymentProvider[]
  ) {
    this.providers = new Map();
    providers.forEach((provider) => {
      this.providers.set(provider.method, provider);
    });
    
    // Initialize email service if RESEND_API_KEY is configured
    if (process.env.RESEND_API_KEY) {
      try {
        this.emailService = new EmailService();
      } catch (error) {
        console.warn("Email service not available:", error);
      }
    }
  }

  async processPayment(data: {
    ticketId: string;
    paymentMethod: PaymentMethod;
    amount: number;
    customerInfo: {
      name: string;
      email?: string;
      phone?: string;
    };
  }): Promise<Payment> {
    // Get ticket
    const ticket = await this.ticketRepository.findById(data.ticketId);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    if (ticket.status !== "pending") {
      throw new Error(`Ticket is already ${ticket.status}`);
    }

    // Calculate ITBMS
    const itbms = calculateITBMS(data.amount, ITBMS_RATE);

    // Create payment record
    const payment = Payment.create({
      ticketId: data.ticketId,
      paymentMethod: data.paymentMethod,
      amount: data.amount,
      itbms,
    });

    // Get payment provider
    const provider = this.providers.get(data.paymentMethod);
    if (!provider) {
      throw new Error(`Payment provider not found for method: ${data.paymentMethod}`);
    }

    // For cash payments, mark as completed immediately
    if (data.paymentMethod === "cash") {
      payment.markAsCompleted("cash-payment", { method: "cash" });
      ticket.markAsPaid();
      await this.paymentRepository.create(payment);
      await this.ticketRepository.update(ticket.id, { status: "paid" });
      
      // Send confirmation email
      await this.sendConfirmationEmail(ticket, payment);
      
      return payment;
    }

    // For online payments, initiate payment
    try {
      payment.markAsProcessing();
      await this.paymentRepository.create(payment);

      const response = await provider.initiatePayment({
        amount: data.amount,
        itbms,
        description: `Ticket ${ticket.qrCode}`,
        customerInfo: data.customerInfo,
        metadata: {
          ticketId: ticket.id,
          tripId: ticket.tripId,
        },
      });

      if (response.status === "completed") {
        payment.markAsCompleted(response.transactionId, response.metadata);
        ticket.markAsPaid();
        await this.ticketRepository.update(ticket.id, { status: "paid" });
        
        // Send confirmation email
        await this.sendConfirmationEmail(ticket, payment);
      } else {
        payment.markAsFailed(response.error);
      }

      await this.paymentRepository.update(payment);

      return payment;
    } catch (error) {
      payment.markAsFailed((error as Error).message);
      await this.paymentRepository.update(payment);
      throw error;
    }
  }

  async processCallback(
    paymentMethod: PaymentMethod,
    data: unknown
  ): Promise<Payment> {
    const provider = this.providers.get(paymentMethod);
    if (!provider) {
      throw new Error(`Payment provider not found for method: ${paymentMethod}`);
    }

    const response = await provider.processCallback(data);
    const payment = await this.paymentRepository.findByTransactionId(response.transactionId);

    if (!payment) {
      throw new Error("Payment not found");
    }

    if (response.status === "completed") {
      payment.markAsCompleted(response.transactionId, response.metadata);
      const ticket = await this.ticketRepository.findById(payment.ticketId);
      if (ticket) {
        ticket.markAsPaid();
        await this.ticketRepository.update(ticket.id, { status: "paid" });
        
        // Send confirmation email
        await this.sendConfirmationEmail(ticket, payment);
      }
    } else if (response.status === "failed") {
      payment.markAsFailed(response.error);
    }

    await this.paymentRepository.update(payment);
    return payment;
  }

  async verifyPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.status === "completed" || payment.status === "failed") {
      return payment;
    }

    const provider = this.providers.get(payment.paymentMethod);
    if (!provider || !payment.providerTransactionId) {
      return payment;
    }

    try {
      const response = await provider.verifyPayment(payment.providerTransactionId);
      if (response.status === "completed") {
        payment.markAsCompleted(response.transactionId, response.metadata);
        const ticket = await this.ticketRepository.findById(payment.ticketId);
        if (ticket) {
          ticket.markAsPaid();
          await this.ticketRepository.update(ticket.id, { status: ticket.status });
          
          // Send confirmation email
          await this.sendConfirmationEmail(ticket, payment);
        }
      } else if (response.status === "failed") {
        payment.markAsFailed(response.error);
      }

      await this.paymentRepository.update(payment);
    } catch (error) {
      console.error("Error verifying payment:", error);
    }

    return payment;
  }

  async refundPayment(paymentId: string, amount?: number): Promise<Payment> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new Error("Payment not found");
    }

    if (!payment.canRefund()) {
      throw new Error("Payment cannot be refunded");
    }

    const provider = this.providers.get(payment.paymentMethod);
    if (!provider || !payment.providerTransactionId) {
      throw new Error("Payment provider not available for refund");
    }

    try {
      const refundAmount = amount || payment.totalAmount;
      await provider.refund(payment.providerTransactionId, refundAmount);
      payment.refund();

      const ticket = await this.ticketRepository.findById(payment.ticketId);
      if (ticket) {
        ticket.cancel();
        await this.ticketRepository.update(ticket.id, { status: ticket.status });
      }

      await this.paymentRepository.update(payment);
      return payment;
    } catch (error) {
      throw new Error(`Failed to process refund: ${(error as Error).message}`);
    }
  }

  private async sendConfirmationEmail(ticket: Ticket, payment: Payment): Promise<void> {
    if (!this.emailService || !ticket.passengerEmail) {
      return;
    }

    try {
      // Get trip information
      const trip = await this.tripRepository.findById(ticket.tripId);
      if (!trip) {
        console.warn("Trip not found for email", ticket.tripId);
        return;
      }

      // Get route information (simplified - in production fetch from route repository)
      // For now, using placeholders - would need RouteRepository to fetch actual data
      const tripData = {
        id: trip.id,
        departureTime: trip.departureTime,
        arrivalEstimate: trip.arrivalEstimate,
        route: {
          origin: "Origen", // TODO: Fetch from route using trip.routeId
          destination: "Destino", // TODO: Fetch from route using trip.routeId
        },
      };

      // Get seat information (simplified - in production fetch from seats table)
      const seatData = {
        id: ticket.seatId,
        number: "A1", // TODO: Fetch actual seat number from seats table
      };

      const paymentData = {
        amount: payment.amount,
        itbms: payment.itbms,
        totalAmount: payment.totalAmount,
        method: payment.paymentMethod,
      };

      await this.emailService.sendTicketConfirmation(
        ticket,
        tripData,
        seatData,
        paymentData
      );
    } catch (error) {
      console.error("Error sending confirmation email:", error);
      // Don't throw - email failure shouldn't block the transaction
    }
  }
}

