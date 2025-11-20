import { IFiscalDriver } from "@/infrastructure/fiscal/IFiscalDriver";

export interface FiscalInvoice {
  invoiceNumber: string;
  authorizationCode: string;
  date: Date;
  customerName: string;
  customerId: string;
  items: FiscalItem[];
  subtotal: number;
  itbms: number;
  total: number;
  paymentMethod: string;
}

export interface FiscalItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export class FiscalService {
  constructor(private driver: IFiscalDriver) {}

  async initialize(): Promise<void> {
    await this.driver.initialize();
  }

  async printInvoice(invoice: FiscalInvoice): Promise<{ invoiceNumber: string; authorizationCode: string }> {
    // Validate invoice data according to Panamanian regulations
    this.validateInvoice(invoice);

    // Print invoice using driver
    const result = await this.driver.printInvoice({
      customerName: invoice.customerName,
      customerId: invoice.customerId,
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
      subtotal: invoice.subtotal,
      itbms: invoice.itbms,
      total: invoice.total,
      paymentMethod: invoice.paymentMethod,
    });

    return {
      invoiceNumber: result.invoiceNumber,
      authorizationCode: result.authorizationCode,
    };
  }

  async printZReport(): Promise<void> {
    await this.driver.printZReport();
  }

  async printXReport(): Promise<void> {
    await this.driver.printXReport();
  }

  async getStatus(): Promise<{ online: boolean; paperStatus: string; error?: string }> {
    return this.driver.getStatus();
  }

  private validateInvoice(invoice: FiscalInvoice): void {
    if (!invoice.customerName || invoice.customerName.trim().length === 0) {
      throw new Error("Customer name is required");
    }

    if (!invoice.customerId || invoice.customerId.trim().length === 0) {
      throw new Error("Customer ID is required");
    }

    if (!invoice.items || invoice.items.length === 0) {
      throw new Error("Invoice must have at least one item");
    }

    // Validate ITBMS (7% in Panama)
    const expectedItbms = invoice.subtotal * 0.07;
    if (Math.abs(invoice.itbms - expectedItbms) > 0.01) {
      throw new Error(`ITBMS calculation error. Expected ${expectedItbms}, got ${invoice.itbms}`);
    }

    // Validate total
    const expectedTotal = invoice.subtotal + invoice.itbms;
    if (Math.abs(invoice.total - expectedTotal) > 0.01) {
      throw new Error(`Total calculation error. Expected ${expectedTotal}, got ${invoice.total}`);
    }
  }
}
