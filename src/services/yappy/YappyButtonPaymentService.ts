import { createHmac } from "crypto";

/**
 * Servicio para el Botón de Pago Yappy
 * Basado en la documentación: https://www.yappy.com.pa/comercial/desarrolladores/boton-de-pago-yappy-nueva-integracion/
 */
export class YappyButtonPaymentService {
  private merchantId: string;
  private secretKey: string;
  private baseUrl: string;
  private domain: string;

  constructor() {
    this.merchantId = process.env.YAPPY_MERCHANT_ID || "";
    this.secretKey = process.env.YAPPY_SECRET_KEY || "";
    this.baseUrl = process.env.YAPPY_BUTTON_API_URL || "https://apipagosbg.bgeneral.cloud";
    this.domain = process.env.YAPPY_DOMAIN || process.env.NEXT_PUBLIC_APP_URL || "https://tdp-eosin.vercel.app";

    if (!this.merchantId || !this.secretKey) {
      console.warn("Yappy Button Payment credentials not configured.");
    }
  }

  /**
   * Paso 1: Validar botón de pago de comercio
   * POST /payments/validate/merchant
   * Obtiene el token de autenticación necesario para validar el comercio
   */
  async validateMerchant(): Promise<{ token: string; epochTime: number }> {
    if (!this.merchantId || !this.domain) {
      throw new Error("Yappy merchant credentials not configured");
    }

    try {
      const response = await fetch(`${this.baseUrl}/payments/validate/merchant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchantId: this.merchantId,
          urlDomain: this.domain,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Yappy merchant validation failed: ${response.status} ${response.statusText}. ${errorData.status?.description || ""}`
        );
      }

      const data = await response.json();

      if (data.status?.code !== "YP-0000") {
        throw new Error(`Yappy validation error: ${data.status?.code} - ${data.status?.description}`);
      }

      return {
        token: data.body.token,
        epochTime: data.body.epochTime,
      };
    } catch (error) {
      console.error("Error validating Yappy merchant:", error);
      throw error;
    }
  }

  /**
   * Paso 2: Creación de orden
   * POST /payments/payment-wc
   * Crea una orden de pago
   */
  async createOrder(data: {
    orderId: string;
    amount: number;
    description: string;
    ipnUrl: string;
    aliasYappy?: string; // Para pruebas
  }): Promise<{ orderId: string; status: string }> {
    if (!this.merchantId || !this.domain) {
      throw new Error("Yappy merchant credentials not configured");
    }

    // Primero validar el comercio para obtener el token
    const validation = await this.validateMerchant();

    // Calcular paymentDate como epoch time
    const paymentDate = Math.floor(Date.now() / 1000);

    try {
      const response = await fetch(`${this.baseUrl}/payments/payment-wc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": validation.token,
        },
        body: JSON.stringify({
          merchantId: this.merchantId,
          orderId: data.orderId,
          domain: this.domain,
          paymentDate: paymentDate,
          aliasYappy: data.aliasYappy, // Solo para pruebas
          ipnUrl: data.ipnUrl,
          amount: data.amount,
          description: data.description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Yappy order creation failed: ${response.status} ${response.statusText}. ${errorData.status?.description || ""}`
        );
      }

      const result = await response.json();

      if (result.status?.code !== "YP-0000") {
        throw new Error(`Yappy order creation error: ${result.status?.code} - ${result.status?.description}`);
      }

      return {
        orderId: data.orderId,
        status: result.body?.status || "pending",
      };
    } catch (error) {
      console.error("Error creating Yappy order:", error);
      throw error;
    }
  }

  /**
   * Valida el hash recibido en el IPN (Instant Payment Notification)
   * Usa HMAC SHA-256 según la documentación
   */
  validateIPNHash(orderId: string, status: string, domain: string, hash: string): boolean {
    try {
      // Decodificar la clave secreta (base64)
      const decodedSecret = Buffer.from(this.secretKey, "base64").toString("utf-8");
      
      // La clave secreta viene en formato: "key1.key2" - necesitamos solo la primera parte
      const secretParts = decodedSecret.split(".");
      const secretKey = secretParts[0];

      // Crear el hash: HMAC SHA-256(orderId + status + domain)
      const dataToHash = `${orderId}${status}${domain}`;
      const calculatedHash = createHmac("sha256", secretKey)
        .update(dataToHash)
        .digest("hex")
        .toLowerCase();

      // Comparar hashes de forma segura
      return calculatedHash === hash.toLowerCase();
    } catch (error) {
      console.error("Error validating Yappy IPN hash:", error);
      return false;
    }
  }

  /**
   * Obtiene la URL del CDN para el componente web del botón
   */
  getButtonCDNUrl(isProduction: boolean = true): string {
    if (isProduction) {
      return "https://bt-cdn.yappy.cloud/v1/cdn/web-component-btn-yappy.js";
    } else {
      return "https://bt-cdn-uat.yappycloud.com/v1/cdn/web-component-btn-yappy.js";
    }
  }
}

// Singleton instance
let buttonPaymentServiceInstance: YappyButtonPaymentService | null = null;

export function getYappyButtonPaymentService(): YappyButtonPaymentService {
  if (!buttonPaymentServiceInstance) {
    buttonPaymentServiceInstance = new YappyButtonPaymentService();
  }
  return buttonPaymentServiceInstance;
}

