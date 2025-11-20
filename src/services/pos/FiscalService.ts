/**
 * Fiscal Service
 * Handles integration with Panamanian fiscal systems
 * Supports common fiscal printers and systems used in Panama
 */

export interface FiscalSaleData {
  ticketId: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  itbms: number;
  total: number;
  paymentMethod: "cash" | "card" | "yappy" | "other";
  passengerName: string;
  passengerDocumentId: string;
  terminalId: string;
}

export interface FiscalResponse {
  success: boolean;
  receiptNumber?: string;
  fiscalNumber?: string;
  error?: string;
}

export class FiscalService {
  private isElectron: boolean;
  private apiEndpoint: string | null;

  constructor() {
    this.isElectron = typeof window !== "undefined" && "electron" in window;
    // TODO: Load from system settings
    this.apiEndpoint = process.env.NEXT_PUBLIC_FISCAL_API_ENDPOINT || null;
  }

  /**
   * Send sale to fiscal system
   * In Electron: Uses IPC to communicate with main process
   * In Browser: Sends to API endpoint
   */
  async sendSale(data: FiscalSaleData): Promise<FiscalResponse> {
    if (this.isElectron && (window as any).electron) {
      try {
        const result = await (window as any).electron.sendToFiscal(data);
        return result;
      } catch (error) {
        console.error("Electron fiscal error:", error);
        return { success: false, error: (error as Error).message };
      }
    }

    // Fallback to API call for web version
    if (this.apiEndpoint) {
      return this.sendViaAPI(data);
    }

    // If no fiscal system configured, return success (for development/testing)
    console.warn("Fiscal system not configured, sale not sent to fiscal system");
    return {
      success: true,
      receiptNumber: `DEV-${Date.now()}`,
    };
  }

  /**
   * Send sale via API endpoint
   */
  private async sendViaAPI(data: FiscalSaleData): Promise<FiscalResponse> {
    try {
      const response = await fetch(`${this.apiEndpoint}/receipts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // TODO: Add authentication headers
        },
        body: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || "Fiscal API error" };
      }

      const result = await response.json();
      return {
        success: true,
        receiptNumber: result.receiptNumber,
        fiscalNumber: result.fiscalNumber,
      };
    } catch (error) {
      console.error("Fiscal API error:", error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Check if fiscal system is available
   */
  async checkFiscalAvailability(): Promise<boolean> {
    if (this.isElectron && (window as any).electron) {
      try {
        const info = await (window as any).electron.getSystemInfo();
        return info.hasFiscal || false;
      } catch {
        return false;
      }
    }

    if (this.apiEndpoint) {
      try {
        const response = await fetch(`${this.apiEndpoint}/health`, {
          method: "GET",
        });
        return response.ok;
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Get fiscal system status
   */
  async getStatus(): Promise<{
    available: boolean;
    connected: boolean;
    lastReceiptNumber?: string;
  }> {
    const available = await this.checkFiscalAvailability();
    
    if (!available) {
      return { available: false, connected: false };
    }

    // TODO: Implement actual status check
    return {
      available: true,
      connected: true,
    };
  }
}

