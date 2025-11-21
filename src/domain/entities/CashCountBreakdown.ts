export type CashDenominationType = "bill" | "coin";

export class CashCountBreakdown {
  constructor(
    public id: string,
    public sessionId: string,
    public denomination: number,
    public count: number,
    public type: CashDenominationType,
    public createdAt: Date
  ) {}

  static create(data: {
    sessionId: string;
    denomination: number;
    count: number;
    type: CashDenominationType;
  }): CashCountBreakdown {
    return new CashCountBreakdown(
      crypto.randomUUID(),
      data.sessionId,
      data.denomination,
      data.count,
      data.type,
      new Date()
    );
  }

  getTotal(): number {
    return this.denomination * this.count;
  }

  updateCount(count: number): void {
    if (count < 0) {
      throw new Error("Count cannot be negative");
    }
    this.count = count;
  }
}

