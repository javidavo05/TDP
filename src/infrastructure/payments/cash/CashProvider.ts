import { IPaymentProvider } from "@/domain/interfaces";
import { PaymentMethod, PaymentStatus, PaymentProviderResponse } from "@/domain/types";

export class CashProvider implements IPaymentProvider {
  method: PaymentMethod = "cash";

  async initiatePayment(data: {
    amount: number;
    itbms: number;
    description: string;
    customerInfo: {
      name: string;
      email?: string;
      phone?: string;
    };
    metadata?: Record<string, unknown>;
  }): Promise<PaymentProviderResponse> {
    // Cash payments are immediately completed
    const transactionId = `CASH-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    return {
      transactionId,
      status: "completed",
      amount: data.amount + data.itbms,
      metadata: {
        method: "cash",
        description: data.description,
        ...data.metadata,
      },
    };
  }

  async verifyPayment(transactionId: string): Promise<PaymentProviderResponse> {
    // Cash payments are always verified (already completed)
    return {
      transactionId,
      status: "completed",
      amount: 0,
      metadata: { method: "cash" },
    };
  }

  async processCallback(data: unknown): Promise<PaymentProviderResponse> {
    // Cash payments don't have callbacks
    throw new Error("Cash payments do not support callbacks");
  }

  async refund(transactionId: string, amount: number): Promise<PaymentProviderResponse> {
    // Cash refunds are processed manually
    return {
      transactionId: `REFUND-${transactionId}`,
      status: "refunded",
      amount,
      metadata: { method: "cash", refund: true },
    };
  }
}

