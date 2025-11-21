import { PaymentMethod } from "../types";

export class POSCashSession {
  constructor(
    public id: string,
    public terminalId: string,
    public openedByUserId: string,
    public openedAt: Date,
    public closedAt: Date | null,
    public initialCash: number,
    public expectedCash: number,
    public actualCash: number | null,
    public totalSales: number,
    public totalCashSales: number,
    public totalCardSales: number,
    public totalTickets: number,
    public closureType: "X" | "Z" | null,
    public notes: string | null,
    public countedTotal: number | null,
    public manualTotal: number | null,
    public countDiscrepancy: number,
    public discrepancyNotes: string | null,
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  static create(data: {
    terminalId: string;
    openedByUserId: string;
    initialCash: number;
    countedTotal?: number;
    manualTotal?: number;
    discrepancyNotes?: string;
  }): POSCashSession {
    const now = new Date();
    const counted = data.countedTotal ?? null;
    const manual = data.manualTotal ?? null;
    const discrepancy = counted && manual ? Math.abs(counted - manual) : 0;
    
    return new POSCashSession(
      crypto.randomUUID(),
      data.terminalId,
      data.openedByUserId,
      now,
      null,
      data.initialCash,
      data.initialCash, // Expected cash starts at initial cash
      null,
      0,
      0,
      0,
      0,
      null,
      null,
      counted,
      manual,
      discrepancy,
      data.discrepancyNotes || null,
      now,
      now
    );
  }

  addSale(amount: number, paymentMethod: PaymentMethod): void {
    if (this.closedAt) {
      throw new Error("Cannot add sale to closed session");
    }
    this.totalSales += amount;
    this.totalTickets += 1;
    
    if (paymentMethod === "cash") {
      this.totalCashSales += amount;
      this.expectedCash += amount;
    } else if (paymentMethod === "card") {
      this.totalCardSales += amount;
    }
    
    this.updatedAt = new Date();
  }

  calculateExpectedCash(): number {
    return this.initialCash + this.totalCashSales;
  }

  close(
    closureType: "X" | "Z",
    actualCash: number,
    notes?: string,
    countedTotal?: number,
    manualTotal?: number,
    discrepancyNotes?: string
  ): void {
    if (this.closedAt) {
      throw new Error("Session is already closed");
    }
    this.closedAt = new Date();
    this.closureType = closureType;
    this.actualCash = actualCash;
    this.expectedCash = this.calculateExpectedCash();
    this.notes = notes || null;
    
    if (countedTotal !== undefined) {
      this.countedTotal = countedTotal;
    }
    if (manualTotal !== undefined) {
      this.manualTotal = manualTotal;
      if (this.countedTotal !== null) {
        this.countDiscrepancy = Math.abs(this.countedTotal - manualTotal);
      }
    }
    if (discrepancyNotes) {
      this.discrepancyNotes = discrepancyNotes;
    }
    
    this.updatedAt = new Date();
  }

  getCashDifference(): number | null {
    if (this.actualCash === null) return null;
    return this.actualCash - this.expectedCash;
  }

  isActive(): boolean {
    return this.closedAt === null;
  }
}

