export class Schedule {
  constructor(
    public id: string,
    public routeId: string,
    public hour: number, // 0-23
    public isExpress: boolean,
    public expressPriceMultiplier: number,
    public isActive: boolean,
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  static create(data: {
    routeId: string;
    hour: number;
    isExpress?: boolean;
    expressPriceMultiplier?: number;
  }): Schedule {
    const now = new Date();
    return new Schedule(
      crypto.randomUUID(),
      data.routeId,
      data.hour,
      data.isExpress || false,
      data.expressPriceMultiplier || 1.0,
      true,
      now,
      now
    );
  }

  getHourLabel(): string {
    return `${this.hour.toString().padStart(2, "0")}:00`;
  }

  getServiceTypeLabel(): string {
    return this.isExpress ? "Expreso" : "Normal";
  }
}

