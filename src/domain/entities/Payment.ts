import { PaymentStatus, PaymentMethod } from "../types";

export class Payment {
  constructor(
    public id: string,
    public ticketId: string,
    public paymentMethod: PaymentMethod,
    public amount: number,
    public itbms: number,
    public totalAmount: number,
    public status: PaymentStatus,
    public providerTransactionId: string | null,
    public providerResponse: Record<string, unknown> | null,
    public processedAt: Date | null,
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  static create(data: {
    ticketId: string;
    paymentMethod: PaymentMethod;
    amount: number;
    itbms: number;
  }): Payment {
    const now = new Date();
    const totalAmount = data.amount + data.itbms;

    return new Payment(
      crypto.randomUUID(),
      data.ticketId,
      data.paymentMethod,
      data.amount,
      data.itbms,
      totalAmount,
      "pending",
      null,
      null,
      null,
      now,
      now
    );
  }

  markAsProcessing(): void {
    if (this.status === "pending") {
      this.status = "processing";
    }
  }

  markAsCompleted(transactionId: string, response?: Record<string, unknown>): void {
    this.status = "completed";
    this.providerTransactionId = transactionId;
    this.providerResponse = response || null;
    this.processedAt = new Date();
  }

  markAsFailed(error?: string): void {
    this.status = "failed";
    if (error) {
      this.providerResponse = { error };
    }
  }

  canRefund(): boolean {
    return this.status === "completed";
  }

  refund(): void {
    if (this.canRefund()) {
      this.status = "refunded";
    }
  }
}

