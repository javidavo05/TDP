import { POSCashSession } from "../entities";

export interface IPOSCashSessionRepository {
  findById(id: string): Promise<POSCashSession | null>;
  findActiveByTerminal(terminalId: string): Promise<POSCashSession | null>;
  findByTerminalAndDate(terminalId: string, date: Date): Promise<POSCashSession[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<POSCashSession[]>;
  create(session: POSCashSession): Promise<POSCashSession>;
  update(session: POSCashSession): Promise<POSCashSession>;
}

