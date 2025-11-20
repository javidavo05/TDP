/**
 * TypeScript definitions for Electron IPC communication
 */

export interface ElectronAPI {
  printTicket: (ticketData: {
    ticketId: string;
    qrCode: string;
    passengerName: string;
    seatNumber: string;
    origin: string;
    destination: string;
    departureTime: string;
    price: number;
    itbms: number;
    total: number;
    ticketNumber: string;
  }) => Promise<{ success: boolean; error?: string }>;

  sendToFiscal: (saleData: {
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
    paymentMethod: string;
    passengerName: string;
    passengerDocumentId: string;
    terminalId: string;
  }) => Promise<{ success: boolean; receiptNumber?: string; fiscalNumber?: string; error?: string }>;

  getSystemInfo: () => Promise<{
    platform: string;
    arch: string;
    hostname: string;
    hasPrinter: boolean;
    hasFiscal: boolean;
  }>;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

