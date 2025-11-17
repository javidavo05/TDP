import { IPaymentProvider } from "@/domain/interfaces";
import { PaymentMethod, PaymentStatus, PaymentProviderResponse } from "@/domain/types";

export class PayUProvider implements IPaymentProvider {
  method: PaymentMethod = "payu";

  private merchantId: string;
  private apiKey: string;
  private apiLogin: string;
  private webhookUrl: string;

  constructor() {
    this.merchantId = process.env.PAYU_MERCHANT_ID || "";
    this.apiKey = process.env.PAYU_API_KEY || "";
    this.apiLogin = process.env.PAYU_API_LOGIN || "";
    this.webhookUrl = process.env.PAYU_WEBHOOK_URL || "";
  }

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
    // TODO: Implement PayU API integration
    try {
      const response = await fetch("https://api.payu.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${Buffer.from(`${this.apiLogin}:${this.apiKey}`).toString("base64")}`,
        },
        body: JSON.stringify({
          merchantId: this.merchantId,
          amount: data.amount + data.itbms,
          description: data.description,
          customer: data.customerInfo,
          webhookUrl: this.webhookUrl,
          metadata: data.metadata,
        }),
      });

      if (!response.ok) {
        throw new Error(`PayU API error: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        transactionId: result.transactionId || result.id,
        status: result.status === "approved" ? "completed" : "pending",
        amount: data.amount + data.itbms,
        metadata: result,
      };
    } catch (error) {
      return {
        transactionId: "",
        status: "failed",
        amount: data.amount + data.itbms,
        error: (error as Error).message,
      };
    }
  }

  async verifyPayment(transactionId: string): Promise<PaymentProviderResponse> {
    try {
      const response = await fetch(`https://api.payu.com/v1/payments/${transactionId}`, {
        method: "GET",
        headers: {
          "Authorization": `Basic ${Buffer.from(`${this.apiLogin}:${this.apiKey}`).toString("base64")}`,
        },
      });

      if (!response.ok) {
        throw new Error(`PayU API error: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        transactionId: result.transactionId || result.id,
        status: result.status === "approved" ? "completed" : "pending",
        amount: result.amount,
        metadata: result,
      };
    } catch (error) {
      return {
        transactionId,
        status: "failed",
        amount: 0,
        error: (error as Error).message,
      };
    }
  }

  async processCallback(data: unknown): Promise<PaymentProviderResponse> {
    const callbackData = data as any;

    return {
      transactionId: callbackData.transactionId || callbackData.id,
      status: callbackData.status === "approved" ? "completed" : "failed",
      amount: callbackData.amount,
      metadata: callbackData,
    };
  }

  async refund(transactionId: string, amount: number): Promise<PaymentProviderResponse> {
    try {
      const response = await fetch(`https://api.payu.com/v1/payments/${transactionId}/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${Buffer.from(`${this.apiLogin}:${this.apiKey}`).toString("base64")}`,
        },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        throw new Error(`PayU API error: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        transactionId: result.transactionId || result.id,
        status: "refunded",
        amount,
        metadata: result,
      };
    } catch (error) {
      return {
        transactionId,
        status: "failed",
        amount,
        error: (error as Error).message,
      };
    }
  }
}

