import { DriverHours } from "../entities/DriverHours";
import { PaginationParams, PaginatedResponse } from "../types";

export interface IDriverHoursRepository {
  findById(id: string): Promise<DriverHours | null>;
  findByDriver(driverId: string, params?: PaginationParams): Promise<PaginatedResponse<DriverHours>>;
  findByDriverAndDate(driverId: string, date: Date): Promise<DriverHours[]>;
  findByDriverAndDateRange(driverId: string, startDate: Date, endDate: Date): Promise<DriverHours[]>;
  findByTrip(tripId: string): Promise<DriverHours | null>;
  create(hours: DriverHours): Promise<DriverHours>;
  update(hours: DriverHours): Promise<DriverHours>;
  delete(id: string): Promise<void>;
}

