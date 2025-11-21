import { POSTransaction } from "../entities";

export interface IPOSTransactionRepository {
  findById(id: string): Promise<POSTransaction | null>;
  findBySession(sessionId: string): Promise<POSTransaction[]>;
  findByTerminalAndDate(terminalId: string, date: Date): Promise<POSTransaction[]>;
  findByTicket(ticketId: string): Promise<POSTransaction | null>;
  create(transaction: POSTransaction): Promise<POSTransaction>;
}

