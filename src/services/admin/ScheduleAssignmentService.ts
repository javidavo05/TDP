import { ScheduleAssignment } from "@/domain/entities";
import { IScheduleAssignmentRepository } from "@/domain/repositories/IScheduleAssignmentRepository";

export class ScheduleAssignmentService {
  constructor(private assignmentRepository: IScheduleAssignmentRepository) {}

  async getAssignmentsByScheduleAndDate(scheduleId: string, date: Date): Promise<ScheduleAssignment[]> {
    return this.assignmentRepository.findByScheduleAndDate(scheduleId, date);
  }

  async getAssignmentsByBusAndDate(busId: string, date: Date): Promise<ScheduleAssignment[]> {
    return this.assignmentRepository.findByBusAndDate(busId, date);
  }

  async getAssignmentsByDateRange(startDate: Date, endDate: Date): Promise<ScheduleAssignment[]> {
    return this.assignmentRepository.findByDateRange(startDate, endDate);
  }

  async assignBusToSchedule(data: {
    scheduleId: string;
    busId: string;
    date: Date;
    driverId?: string;
    assistantId?: string;
  }): Promise<ScheduleAssignment> {
    // Check if assignment already exists
    const existing = await this.assignmentRepository.findByScheduleAndDate(
      data.scheduleId,
      data.date
    );
    
    const alreadyAssigned = existing.some(a => a.busId === data.busId);
    if (alreadyAssigned) {
      throw new Error("Bus already assigned to this schedule for this date");
    }

    const assignment = ScheduleAssignment.create({
      scheduleId: data.scheduleId,
      busId: data.busId,
      date: data.date,
      driverId: data.driverId,
      assistantId: data.assistantId,
    });
    return this.assignmentRepository.create(assignment);
  }

  async removeAssignment(scheduleId: string, busId: string, date: Date): Promise<void> {
    return this.assignmentRepository.deleteByScheduleAndBusAndDate(scheduleId, busId, date);
  }

  async removeAssignmentById(id: string): Promise<void> {
    return this.assignmentRepository.delete(id);
  }

  async updateAssignmentBus(
    assignmentId: string,
    newBusId: string,
    reason: string,
    changedBy: string
  ): Promise<{ assignment: ScheduleAssignment; change: any }> {
    const existing = await this.assignmentRepository.findById(assignmentId);
    if (!existing) {
      throw new Error("Assignment not found");
    }

    const oldBusId = existing.busId;
    
    // Update assignment
    const updated = new ScheduleAssignment(
      existing.id,
      existing.scheduleId,
      newBusId,
      existing.date,
      existing.createdAt,
      existing.driverId,
      existing.assistantId,
      existing.status,
      new Date()
    );

    const updatedAssignment = await this.assignmentRepository.update(updated);

    // Create change record
    const { BusAssignmentChange } = await import("@/domain/entities/BusAssignmentChange");
    const { BusAssignmentChangeRepository } = await import("@/infrastructure/db/supabase/BusAssignmentChangeRepository");
    
    const changeRepo = new BusAssignmentChangeRepository();
    const change = BusAssignmentChange.create({
      assignmentId: assignmentId,
      oldBusId: oldBusId,
      newBusId: newBusId,
      reason: reason,
      changedBy: changedBy,
    });

    const savedChange = await changeRepo.create(change);

    return { assignment: updatedAssignment, change: savedChange };
  }
}

