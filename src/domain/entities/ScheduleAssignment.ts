export class ScheduleAssignment {
  constructor(
    public id: string,
    public scheduleId: string,
    public busId: string,
    public date: Date,
    public createdAt: Date,
    public driverId?: string,
    public assistantId?: string,
    public status: 'assigned' | 'in_progress' | 'completed' | 'cancelled' = 'assigned',
    public updatedAt?: Date
  ) {}

  static create(data: {
    scheduleId: string;
    busId: string;
    date: Date;
    driverId?: string;
    assistantId?: string;
    status?: 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  }): ScheduleAssignment {
    return new ScheduleAssignment(
      crypto.randomUUID(),
      data.scheduleId,
      data.busId,
      data.date,
      new Date(),
      data.driverId,
      data.assistantId,
      data.status || 'assigned',
      new Date()
    );
  }
}

