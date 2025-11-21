import { PaymentMethod } from "../types";

export class POSTransaction {
  constructor(
    public id: string,
    public sessionId: string,
    public terminalId: string,
    public ticketId: string | null,
    public paymentId: string | null,
    public transactionType: "sale" | "refund" | "adjustment",
    public amount: number,
    public paymentMethod: PaymentMethod,
    public receivedAmount: number | null,
    public changeAmount: number,
    public processedByUserId: string,
    public createdAt: Date
  ) {}

  static create(data: {
    sessionId: string;
    terminalId: string;
    ticketId?: string;
    paymentId?: string;
    transactionType: "sale" | "refund" | "adjustment";
    amount: number;
    paymentMethod: PaymentMethod;
    receivedAmount?: number;
    changeAmount?: number;
    processedByUserId: string;
  }): POSTransaction {
    return new POSTransaction(
      crypto.randomUUID(),
      data.sessionId,
      data.terminalId,
      data.ticketId || null,
      data.paymentId || null,
      data.transactionType,
      data.amount,
      data.paymentMethod,
      data.receivedAmount || null,
      data.changeAmount || 0,
      data.processedByUserId,
      new Date()
    );
  }

  validateAmount(expected: number, received: number): boolean {
    if (received < expected) {
      return false;
    }
    this.receivedAmount = received;
    this.changeAmount = received - expected;
    return true;
  }

  getChangeAmount(): number {
    if (this.receivedAmount === null) return 0;
    return Math.max(0, this.receivedAmount - this.amount);
  }
}

