import { Payment, Ticket } from "@/domain/entities";
import { IPaymentRepository, ITicketRepository } from "@/domain/repositories";
import { IPaymentProvider } from "@/domain/interfaces";
import { PaymentMethod, PaymentStatus, PaymentProviderResponse } from "@/domain/types";
import { calculateITBMS, ITBMS_RATE } from "@/lib/constants";

export class PaymentService {
  private providers: Map<PaymentMethod, IPaymentProvider>;

  constructor(
    private paymentRepository: IPaymentRepository,
    private ticketRepository: ITicketRepository,
    providers: IPaymentProvider[]
  ) {
    this.providers = new Map();
    providers.forEach((provider) => {
      this.providers.set(provider.method, provider);
    });
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
      await this.ticketRepository.update(ticket);
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
      } else {
        payment.markAsFailed(response.error);
      }

      await this.paymentRepository.update(payment);
      await this.ticketRepository.update(ticket);

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
        await this.ticketRepository.update(ticket);
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
          await this.ticketRepository.update(ticket);
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
        await this.ticketRepository.update(ticket);
      }

      await this.paymentRepository.update(payment);
      return payment;
    } catch (error) {
      throw new Error(`Failed to process refund: ${(error as Error).message}`);
    }
  }
}

