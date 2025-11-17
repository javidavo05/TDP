import { RevenueReport, OccupancyMetrics } from "../types";

export interface IAnalyticsRepository {
  getDailyRevenue(busId: string, date: Date): Promise<RevenueReport | null>;
  getOwnerRevenue(ownerId: string, startDate: Date, endDate: Date): Promise<RevenueReport>;
  getTripOccupancy(tripId: string): Promise<OccupancyMetrics | null>;
  getRouteUsage(routeId: string, date: Date): Promise<number>;
  updateDailyRevenue(busId: string, ownerId: string, date: Date, amount: number, tickets: number, itbms: number): Promise<void>;
  recordOccupancy(tripId: string, busId: string, totalSeats: number, occupiedSeats: number): Promise<void>;
}

