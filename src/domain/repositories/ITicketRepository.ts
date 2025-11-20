import { Ticket } from "../entities";
import { PaginationParams, PaginatedResponse } from "../types";

export interface ITicketRepository {
  findById(id: string): Promise<Ticket | null>;
  findByQRCode(qrCode: string): Promise<Ticket | null>;
  findByQRToken(token: string): Promise<Ticket | null>;
  findByUser(userId: string, params?: PaginationParams): Promise<PaginatedResponse<Ticket>>;
  findByTrip(tripId: string): Promise<Ticket[]>;
  findBySeat(seatId: string, tripId: string): Promise<Ticket | null>;
  findByTerminalAndDate(terminalId: string, startDate: Date, endDate: Date): Promise<Ticket[]>;
  create(ticket: Partial<Ticket>): Promise<Ticket>;
  update(id: string, ticket: Partial<Ticket>): Promise<Ticket>;
  delete(id: string): Promise<void>;
  countByTrip(tripId: string): Promise<number>;
}

