// BusAssignmentChange is defined inline in the repository
interface BusAssignmentChange {
  id: string;
  assignmentId: string;
  oldBusId: string | null;
  newBusId: string;
  reason: string;
  changedBy: string;
  changedAt: Date;
}

export interface IBusAssignmentChangeRepository {
  findById(id: string): Promise<BusAssignmentChange | null>;
  findByAssignmentId(assignmentId: string): Promise<BusAssignmentChange[]>;
  findByBusId(busId: string): Promise<BusAssignmentChange[]>;
  findByChangedBy(userId: string): Promise<BusAssignmentChange[]>;
  create(change: BusAssignmentChange): Promise<BusAssignmentChange>;
}

