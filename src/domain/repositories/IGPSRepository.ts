import { GPSCoordinates } from "../types";

export interface IGPSRepository {
  log(tripId: string, busId: string, coordinates: GPSCoordinates): Promise<void>;
  getLatest(tripId: string): Promise<GPSCoordinates | null>;
  getHistory(tripId: string, startDate?: Date, endDate?: Date): Promise<GPSCoordinates[]>;
  getByBus(busId: string, limit?: number): Promise<GPSCoordinates[]>;
}

