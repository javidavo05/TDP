import { POSTerminal } from "../entities";
import { PaginationParams, PaginatedResponse } from "../types";

export interface IPOSTerminalRepository {
  findById(id: string): Promise<POSTerminal | null>;
  findByLocationCode(locationCode: string): Promise<POSTerminal | null>;
  findByAssignedUser(userId: string): Promise<POSTerminal | null>;
  findAll(params?: PaginationParams): Promise<PaginatedResponse<POSTerminal>>;
  findOpenTerminals(): Promise<POSTerminal[]>;
  create(terminal: POSTerminal): Promise<POSTerminal>;
  update(terminal: POSTerminal): Promise<POSTerminal>;
  delete(id: string): Promise<void>;
}

