import { IPaymentProvider } from "@/domain/interfaces";
import { PaymentMethod, PaymentStatus, PaymentProviderResponse } from "@/domain/types";

export class PagueloFacilProvider implements IPaymentProvider {
  method: PaymentMethod = "paguelofacil";

  private cclw: string;
  private accessToken: string;
  private apiUrl: string;
  private webhookUrl: string;

  constructor() {
    this.cclw = process.env.PAGUELOFACIL_CCLW || "";
    this.accessToken = process.env.PAGUELOFACIL_ACCESS_TOKEN || "";
    this.apiUrl = process.env.PAGUELOFACIL_API_URL || "https://api.paguelofacil.com";
    this.webhookUrl = process.env.PAGUELOFACIL_WEBHOOK_URL || "";

    if (!this.cclw || !this.accessToken) {
      console.warn("PagueloFacil credentials not fully configured. CCLW and Access Token are required.");
    }
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
    if (!this.cclw || !this.accessToken) {
      return {
        transactionId: "",
        status: "failed",
        amount: data.amount + data.itbms,
        error: "PagueloFacil credentials not configured",
      };
    }

    try {
      const totalAmount = data.amount + data.itbms;

      // PagueloFacil API integration
      // Basado en la documentación: https://soporte.paguelofacil.com/portal/es/kb/paguelofacil/integraciones/e-commerce
      const response = await fetch(`${this.apiUrl}/v1/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.accessToken}`,
          "X-CCLW": this.cclw,
        },
        body: JSON.stringify({
          amount: totalAmount,
          description: data.description,
          customer: {
            name: data.customerInfo.name,
            email: data.customerInfo.email,
            phone: data.customerInfo.phone,
          },
          callbackUrl: this.webhookUrl,
          metadata: data.metadata,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `PagueloFacil API error: ${response.status} ${response.statusText}. ${errorData.message || ""}`
        );
      }

      const result = await response.json();

      // Mapear estados de PagueloFacil a PaymentStatus
      const statusMap: Record<string, PaymentStatus> = {
        approved: "completed",
        pending: "pending",
        rejected: "failed",
        failed: "failed",
      };

      return {
        transactionId: result.transactionId || result.id || result.transaction_id,
        status: statusMap[result.status?.toLowerCase()] || "pending",
        amount: totalAmount,
        metadata: {
          ...result,
          paymentUrl: result.paymentUrl || result.payment_url, // URL para redirigir al usuario
        },
      };
    } catch (error) {
      console.error("Error initiating PagueloFacil payment:", error);
      return {
        transactionId: "",
        status: "failed",
        amount: data.amount + data.itbms,
        error: (error as Error).message,
      };
    }
  }

  async verifyPayment(transactionId: string): Promise<PaymentProviderResponse> {
    if (!this.cclw || !this.accessToken) {
      return {
        transactionId,
        status: "failed",
        amount: 0,
        error: "PagueloFacil credentials not configured",
      };
    }

    try {
      const response = await fetch(`${this.apiUrl}/v1/payments/${transactionId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.accessToken}`,
          "X-CCLW": this.cclw,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `PagueloFacil API error: ${response.status} ${response.statusText}. ${errorData.message || ""}`
        );
      }

      const result = await response.json();

      // Mapear estados de PagueloFacil a PaymentStatus
      const statusMap: Record<string, PaymentStatus> = {
        approved: "completed",
        pending: "pending",
        rejected: "failed",
        failed: "failed",
      };

      return {
        transactionId: result.transactionId || result.id || result.transaction_id,
        status: statusMap[result.status?.toLowerCase()] || "pending",
        amount: result.amount || 0,
        metadata: result,
      };
    } catch (error) {
      console.error("Error verifying PagueloFacil payment:", error);
      return {
        transactionId,
        status: "failed",
        amount: 0,
        error: (error as Error).message,
      };
    }
  }

  async processCallback(data: unknown): Promise<PaymentProviderResponse> {
    try {
      const callbackData = data as any;

      // Extraer información del webhook de PagueloFacil
      const transactionId =
        callbackData.transactionId ||
        callbackData.id ||
        callbackData.transaction_id ||
        callbackData.payment_id;

      if (!transactionId) {
        throw new Error("Transaction ID not found in PagueloFacil callback data");
      }

      // Mapear estados de PagueloFacil a PaymentStatus
      const statusMap: Record<string, PaymentStatus> = {
        approved: "completed",
        pending: "pending",
        rejected: "failed",
        failed: "failed",
        cancelled: "failed",
      };

      const status = statusMap[callbackData.status?.toLowerCase()] || "pending";

      // Verificar la transacción con la API para asegurar autenticidad
      if (status === "completed") {
        const verification = await this.verifyPayment(transactionId);
        return verification;
      }

      return {
        transactionId,
        status,
        amount: callbackData.amount || 0,
        metadata: callbackData,
      };
    } catch (error) {
      console.error("Error processing PagueloFacil callback:", error);
      return {
        transactionId: (data as any)?.transactionId || (data as any)?.id || "",
        status: "failed",
        amount: 0,
        error: (error as Error).message,
      };
    }
  }

  async refund(transactionId: string, amount: number): Promise<PaymentProviderResponse> {
    if (!this.cclw || !this.accessToken) {
      return {
        transactionId,
        status: "failed",
        amount,
        error: "PagueloFacil credentials not configured",
      };
    }

    try {
      const response = await fetch(`${this.apiUrl}/v1/payments/${transactionId}/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.accessToken}`,
          "X-CCLW": this.cclw,
        },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `PagueloFacil API error: ${response.status} ${response.statusText}. ${errorData.message || ""}`
        );
      }

      const result = await response.json();

      return {
        transactionId: result.transactionId || result.id || transactionId,
        status: "refunded",
        amount,
        metadata: result,
      };
    } catch (error) {
      console.error("Error refunding PagueloFacil payment:", error);
      return {
        transactionId,
        status: "failed",
        amount,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Procesa un pago directamente con datos de tarjeta de crédito
   * NOTA: Los datos de tarjeta nunca se almacenan, solo se envían a PagueloFacil para procesamiento
   */
  async processCardPayment(data: {
    cardNumber: string;
    expiryMonth: number;
    expiryYear: number;
    cvv: string;
    cardholderName: string;
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
    if (!this.cclw || !this.accessToken) {
      return {
        transactionId: "",
        status: "failed",
        amount: data.amount + data.itbms,
        error: "PagueloFacil credentials not configured",
      };
    }

    try {
      const totalAmount = data.amount + data.itbms;

      // PagueloFacil API para procesar pago con tarjeta
      // NOTA: El endpoint puede variar según la documentación oficial de PagueloFacil
      // Si este endpoint no funciona, consultar la documentación oficial o contactar soporte
      const response = await fetch(`${this.apiUrl}/v1/payments/charge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.accessToken}`,
          "X-CCLW": this.cclw,
        },
        body: JSON.stringify({
          amount: totalAmount,
          description: data.description,
          card: {
            number: data.cardNumber,
            expiryMonth: data.expiryMonth,
            expiryYear: data.expiryYear,
            cvv: data.cvv,
            cardholderName: data.cardholderName,
          },
          customer: {
            name: data.customerInfo.name,
            email: data.customerInfo.email,
            phone: data.customerInfo.phone,
          },
          callbackUrl: this.webhookUrl,
          metadata: data.metadata,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `PagueloFacil API error: ${response.status} ${response.statusText}. ${errorData.message || errorData.error || ""}`
        );
      }

      const result = await response.json();

      // Mapear estados de PagueloFacil a PaymentStatus
      const statusMap: Record<string, PaymentStatus> = {
        approved: "completed",
        pending: "pending",
        rejected: "failed",
        failed: "failed",
      };

      return {
        transactionId: result.transactionId || result.id || result.transaction_id,
        status: statusMap[result.status?.toLowerCase()] || "pending",
        amount: totalAmount,
        metadata: result,
      };
    } catch (error) {
      console.error("Error processing card payment with PagueloFacil:", error);
      return {
        transactionId: "",
        status: "failed",
        amount: data.amount + data.itbms,
        error: (error as Error).message,
      };
    }
  }
}

