import { PaymentMethod, PaymentStatus, PaymentProviderResponse } from "../types";

export interface IPaymentProvider {
  method: PaymentMethod;
  
  initiatePayment(data: {
    amount: number;
    itbms: number;
    description: string;
    customerInfo: {
      name: string;
      email?: string;
      phone?: string;
    };
    metadata?: Record<string, unknown>;
  }): Promise<PaymentProviderResponse>;
  
  verifyPayment(transactionId: string): Promise<PaymentProviderResponse>;
  
  processCallback(data: unknown): Promise<PaymentProviderResponse>;
  
  refund(transactionId: string, amount: number): Promise<PaymentProviderResponse>;
}

