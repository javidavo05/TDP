import { GPSCoordinates } from "../types";

export interface GPSLog {
  tripId: string;
  busId: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  timestamp: Date;
}

export interface IGPSRepository {
  log(tripId: string, busId: string, coordinates: GPSCoordinates): Promise<void>;
  create(log: GPSLog): Promise<void>;
  getLatest(tripId: string): Promise<GPSCoordinates | null>;
  getLatestByTrip(tripId: string): Promise<GPSLog | null>;
  getHistory(tripId: string, startDate?: Date, endDate?: Date): Promise<GPSCoordinates[]>;
  getHistoryByTrip(tripId: string, limit?: number): Promise<GPSLog[]>;
  getByBus(busId: string, limit?: number): Promise<GPSCoordinates[]>;
}

