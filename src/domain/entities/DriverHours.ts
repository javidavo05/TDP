export class DriverHours {
  constructor(
    public id: string,
    public driverId: string,
    public tripId: string | null,
    public startTime: Date,
    public endTime: Date | null,
    public hoursWorked: number,
    public date: Date,
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  static create(data: {
    driverId: string;
    tripId?: string | null;
    startTime: Date;
    endTime?: Date | null;
    hoursWorked?: number;
    date: Date;
  }): DriverHours {
    const now = new Date();
    const hoursWorked = data.hoursWorked || 
      (data.endTime && data.startTime 
        ? (data.endTime.getTime() - data.startTime.getTime()) / (1000 * 60 * 60)
        : 0);
    
    return new DriverHours(
      crypto.randomUUID(),
      data.driverId,
      data.tripId || null,
      data.startTime,
      data.endTime || null,
      hoursWorked,
      data.date,
      now,
      now
    );
  }

  calculateHours(): number {
    if (!this.endTime) return 0;
    return (this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60 * 60);
  }

  isComplete(): boolean {
    return this.endTime !== null;
  }
}

