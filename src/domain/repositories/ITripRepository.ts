import { Trip } from "../entities";
import { TripSearchFilters, PaginationParams, PaginatedResponse } from "../types";

export interface ITripRepository {
  findById(id: string): Promise<Trip | null>;
  search(filters: TripSearchFilters, params?: PaginationParams): Promise<PaginatedResponse<Trip>>;
  findByRoute(routeId: string, date?: Date): Promise<Trip[]>;
  findByBus(busId: string, params?: PaginationParams): Promise<PaginatedResponse<Trip>>;
  findUpcoming(hours?: number): Promise<Trip[]>;
  create(trip: Trip): Promise<Trip>;
  update(trip: Trip): Promise<Trip>;
  updateLocation(tripId: string, location: { latitude: number; longitude: number; lastUpdate: Date }): Promise<void>;
  delete(id: string): Promise<void>;
}

