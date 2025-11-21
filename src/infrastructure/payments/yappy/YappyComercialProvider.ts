import { IPaymentProvider } from "@/domain/interfaces";
import { PaymentMethod, PaymentStatus, PaymentProviderResponse } from "@/domain/types";
import { getYappyAPIClient } from "@/services/yappy/YappyAPIClient";

export interface CollectionMethod {
  alias: string;
  type: "DIRECTORIO" | "BOTON_DE_PAGO" | "PUNTO_YAPPY" | "INTEGRACION_YAPPY" | "PUNTO_DE_VENTA";
  details?: Array<{ id: string; value: string }>;
}

export interface TransactionDetail {
  id: string;
  number: string;
  registration_date: string;
  payment_date: string;
  cut_off_date: string;
  type: string;
  category: "INTERBANK" | "INTRABANK";
  referenceName?: string;
  referenceId?: string;
  charge: {
    amount: number;
    partial_amount: number;
    tip: number;
    tax: number;
    currency: string;
  };
  fee?: {
    amount: number;
    currency: string;
  };
  description: string;
  bill_description?: string;
  status: "PENDING" | "EXECUTED" | "COMPLETED" | "REJECTED" | "FAILED";
  metadata?: Array<{ id: string; value: string }>;
  debitor?: {
    alias: string;
    complete_name: string;
    alias_type: string;
    bank_name: string;
  };
  creditor?: {
    alias: string;
    complete_name: string;
    alias_type: string;
    bank_name: string;
  };
}

/**
 * Proveedor de pago Yappy Comercial
 * Implementa la integración según el swagger v1.1.0
 */
export class YappyComercialProvider implements IPaymentProvider {
  method: PaymentMethod = "yappy";

  private merchantId: string;
  private webhookUrl: string;
  private apiClient;

  constructor() {
    this.merchantId = process.env.YAPPY_MERCHANT_ID || "";
    this.webhookUrl = process.env.YAPPY_WEBHOOK_URL || "";
    this.apiClient = getYappyAPIClient();
  }

  /**
   * Inicia un pago usando el Botón de Pago Yappy
   * Implementación basada en: https://www.yappy.com.pa/comercial/desarrolladores/boton-de-pago-yappy-nueva-integracion/
   */
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
    try {
      const { getYappyButtonPaymentService } = await import("@/services/yappy/YappyButtonPaymentService");
      const buttonService = getYappyButtonPaymentService();

      // Generar orderId único (máximo 15 caracteres alfanuméricos)
      const orderId = `TDP${Date.now().toString().slice(-12)}`.substring(0, 15);

      // Crear la orden usando el Botón de Pago Yappy
      const ipnUrl = `${process.env.YAPPY_WEBHOOK_URL || process.env.NEXT_PUBLIC_APP_URL || "https://pimetransport.com"}/api/yappy/button/ipn`;
      
      const result = await buttonService.createOrder({
        orderId,
        amount: data.amount + data.itbms,
        description: data.description,
        ipnUrl,
      });

      return {
        transactionId: orderId,
        status: "pending",
        amount: data.amount + data.itbms,
        metadata: {
          orderId,
          amount: data.amount + data.itbms,
          description: data.description,
          customerInfo: data.customerInfo,
          ipnUrl,
          merchantId: this.merchantId,
          ...data.metadata,
        },
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

  /**
   * Verifica el estado de un pago consultando el detalle de la transacción
   * GET /v1/movement/{transaction-id}
   */
  async verifyPayment(transactionId: string): Promise<PaymentProviderResponse> {
    try {
      const transaction = await this.apiClient.get<TransactionDetail>(
        `/v1/movement/${transactionId}`
      );

      // Mapear estados de Yappy a estados de PaymentStatus
      const statusMap: Record<string, PaymentStatus> = {
        PENDING: "pending",
        EXECUTED: "processing",
        COMPLETED: "completed",
        REJECTED: "failed",
        FAILED: "failed",
      };

      return {
        transactionId: transaction.id,
        status: statusMap[transaction.status] || "pending",
        amount: transaction.charge.amount,
        metadata: {
          transaction,
        },
      };
    } catch (error) {
      // Si no se encuentra la transacción, puede estar pendiente
      return {
        transactionId,
        status: "pending",
        amount: 0,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Procesa un callback/webhook de Yappy
   * El webhook contiene información sobre el estado de la transacción
   */
  async processCallback(data: unknown): Promise<PaymentProviderResponse> {
    try {
      const callbackData = data as any;

      // El webhook puede venir en diferentes formatos
      // Intentar extraer el ID de transacción
      const transactionId =
        callbackData.id ||
        callbackData.transactionId ||
        callbackData.transaction_id;

      if (!transactionId) {
        throw new Error("Transaction ID not found in callback data");
      }

      // Verificar el estado consultando la API
      return await this.verifyPayment(transactionId);
    } catch (error) {
      return {
        transactionId: "",
        status: "failed",
        amount: 0,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Anula una transacción
   * PUT /v1/transaction/{transaction-id}
   */
  async refund(transactionId: string, amount: number): Promise<PaymentProviderResponse> {
    try {
      await this.apiClient.put(`/v1/transaction/${transactionId}`);

      return {
        transactionId,
        status: "refunded",
        amount,
        metadata: {
          refundedAt: new Date().toISOString(),
        },
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

  /**
   * Obtiene los métodos de cobro disponibles
   * Útil para el frontend
   */
  async getCollectionMethods(): Promise<CollectionMethod[]> {
    const result = await this.apiClient.get<{ collections: CollectionMethod[] }>(
      "/v1/collection-method"
    );
    return result.collections;
  }
}

