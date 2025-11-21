export class POSTerminal {
  constructor(
    public id: string,
    public terminalIdentifier: string,
    public physicalLocation: string,
    public locationCode: string | null,
    public assignedUserId: string | null,
    public initialCashAmount: number,
    public currentCashAmount: number,
    public isOpen: boolean,
    public lastOpenedAt: Date | null,
    public lastClosedAt: Date | null,
    public openedByUserId: string | null,
    public isActive: boolean,
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  static create(data: {
    terminalIdentifier: string;
    physicalLocation: string;
    locationCode?: string;
    assignedUserId?: string;
  }): POSTerminal {
    const now = new Date();
    return new POSTerminal(
      crypto.randomUUID(),
      data.terminalIdentifier,
      data.physicalLocation,
      data.locationCode || null,
      data.assignedUserId || null,
      0,
      0,
      false,
      null,
      null,
      null,
      true,
      now,
      now
    );
  }

  openCashRegister(userId: string, initialCash: number): void {
    if (this.isOpen) {
      throw new Error("Cash register is already open");
    }
    this.isOpen = true;
    this.initialCashAmount = initialCash;
    this.currentCashAmount = initialCash;
    this.lastOpenedAt = new Date();
    this.openedByUserId = userId;
  }

  closeCashRegister(closureType: "X" | "Z", actualCash: number): void {
    if (!this.isOpen) {
      throw new Error("Cash register is not open");
    }
    this.isOpen = false;
    this.lastClosedAt = new Date();
    if (closureType === "Z") {
      // Cierre Z resetea los contadores
      this.currentCashAmount = 0;
      this.initialCashAmount = 0;
    }
  }

  canBeOpenedBy(userId: string): boolean {
    return this.assignedUserId === userId || !this.assignedUserId;
  }
}

