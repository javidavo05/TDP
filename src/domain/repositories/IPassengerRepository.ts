import { Passenger } from "../entities/Passenger";
import { PaginationParams, PaginatedResponse } from "../types";

export interface IPassengerRepository {
  findById(id: string): Promise<Passenger | null>;
  findByDocumentId(documentId: string): Promise<Passenger | null>;
  findAll(params?: PaginationParams): Promise<PaginatedResponse<Passenger>>;
  search(query: string, params?: PaginationParams): Promise<PaginatedResponse<Passenger>>;
  create(passenger: Passenger): Promise<Passenger>;
  update(passenger: Passenger): Promise<Passenger>;
  delete(id: string): Promise<void>;
}

