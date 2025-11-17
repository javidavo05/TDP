import { Bus } from "../entities";
import { PaginationParams, PaginatedResponse } from "../types";

export interface IBusRepository {
  findById(id: string): Promise<Bus | null>;
  findByOwner(ownerId: string, params?: PaginationParams): Promise<PaginatedResponse<Bus>>;
  findByPlate(plateNumber: string): Promise<Bus | null>;
  findAll(params?: PaginationParams): Promise<PaginatedResponse<Bus>>;
  create(bus: Bus): Promise<Bus>;
  update(bus: Bus): Promise<Bus>;
  delete(id: string): Promise<void>;
  findActive(): Promise<Bus[]>;
}

