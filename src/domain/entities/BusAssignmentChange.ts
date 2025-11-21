export class BusAssignmentChange {
  constructor(
    public id: string,
    public assignmentId: string,
    public oldBusId: string | null,
    public newBusId: string,
    public reason: string,
    public changedBy: string,
    public changedAt: Date,
    public createdAt: Date
  ) {}

  static create(data: {
    assignmentId: string;
    oldBusId: string | null;
    newBusId: string;
    reason: string;
    changedBy: string;
  }): BusAssignmentChange {
    const now = new Date();
    return new BusAssignmentChange(
      crypto.randomUUID(),
      data.assignmentId,
      data.oldBusId,
      data.newBusId,
      data.reason,
      data.changedBy,
      now,
      now
    );
  }
}

