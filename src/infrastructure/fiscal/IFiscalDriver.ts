export interface FiscalInvoiceData {
  customerName: string;
  customerId: string;
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
}

export interface FiscalPrintResult {
  invoiceNumber: string;
  authorizationCode: string;
}

export interface IFiscalDriver {
  initialize(): Promise<void>;
  printInvoice(invoice: FiscalInvoiceData): Promise<FiscalPrintResult>;
  printZReport(): Promise<void>;
  printXReport(): Promise<void>;
  getStatus(): Promise<{ online: boolean; paperStatus: string; error?: string }>;
}

