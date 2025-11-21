import { ScheduleAssignment } from "../entities";
import { PaginationParams, PaginatedResponse } from "../types";

export interface IScheduleAssignmentRepository {
  findById(id: string): Promise<ScheduleAssignment | null>;
  findByScheduleAndDate(scheduleId: string, date: Date): Promise<ScheduleAssignment[]>;
  findByBusAndDate(busId: string, date: Date): Promise<ScheduleAssignment[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<ScheduleAssignment[]>;
  create(assignment: ScheduleAssignment): Promise<ScheduleAssignment>;
  update(assignment: ScheduleAssignment): Promise<ScheduleAssignment>;
  delete(id: string): Promise<void>;
  deleteByScheduleAndBusAndDate(scheduleId: string, busId: string, date: Date): Promise<void>;
}

