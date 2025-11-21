import { POSTerminal } from "@/domain/entities";
import { IPOSTerminalRepository } from "@/domain/repositories/IPOSTerminalRepository";
import { PaginationParams, PaginatedResponse } from "@/domain/types";

export class POSTerminalService {
  constructor(private terminalRepository: IPOSTerminalRepository) {}

  async listTerminals(params?: PaginationParams): Promise<PaginatedResponse<POSTerminal>> {
    return this.terminalRepository.findAll(params);
  }

  async getTerminalById(id: string): Promise<POSTerminal | null> {
    return this.terminalRepository.findById(id);
  }

  async getTerminalByLocationCode(locationCode: string): Promise<POSTerminal | null> {
    return this.terminalRepository.findByLocationCode(locationCode);
  }

  async getTerminalByAssignedUser(userId: string): Promise<POSTerminal | null> {
    return this.terminalRepository.findByAssignedUser(userId);
  }

  async createTerminal(data: {
    terminalIdentifier: string;
    physicalLocation: string;
    locationCode?: string;
    assignedUserId?: string;
  }): Promise<POSTerminal> {
    const terminal = POSTerminal.create(data);
    return this.terminalRepository.create(terminal);
  }

  async updateTerminal(terminal: POSTerminal): Promise<POSTerminal> {
    return this.terminalRepository.update(terminal);
  }

  async deleteTerminal(id: string): Promise<void> {
    return this.terminalRepository.delete(id);
  }

  async getOpenTerminals(): Promise<POSTerminal[]> {
    return this.terminalRepository.findOpenTerminals();
  }
}

