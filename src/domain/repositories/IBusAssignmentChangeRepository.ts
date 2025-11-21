import { BusAssignmentChange } from "@/domain/entities";

export interface IBusAssignmentChangeRepository {
  findById(id: string): Promise<BusAssignmentChange | null>;
  findByAssignmentId(assignmentId: string): Promise<BusAssignmentChange[]>;
  findByBusId(busId: string): Promise<BusAssignmentChange[]>;
  findByChangedBy(userId: string): Promise<BusAssignmentChange[]>;
  create(change: BusAssignmentChange): Promise<BusAssignmentChange>;
}

