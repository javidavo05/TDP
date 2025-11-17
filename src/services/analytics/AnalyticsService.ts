import { IAnalyticsRepository } from "@/domain/repositories";
import { RevenueReport, OccupancyMetrics } from "@/domain/types";

export class AnalyticsService {
  constructor(private analyticsRepository: IAnalyticsRepository) {}

  async getDailyRevenue(busId: string, date: Date): Promise<RevenueReport | null> {
    return this.analyticsRepository.getDailyRevenue(busId, date);
  }

  async getOwnerRevenue(
    ownerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<RevenueReport> {
    return this.analyticsRepository.getOwnerRevenue(ownerId, startDate, endDate);
  }

  async getTripOccupancy(tripId: string): Promise<OccupancyMetrics | null> {
    return this.analyticsRepository.getTripOccupancy(tripId);
  }

  async getRouteUsage(routeId: string, date: Date): Promise<number> {
    return this.analyticsRepository.getRouteUsage(routeId, date);
  }

  async updateDailyRevenue(
    busId: string,
    ownerId: string,
    date: Date,
    amount: number,
    tickets: number,
    itbms: number
  ): Promise<void> {
    await this.analyticsRepository.updateDailyRevenue(busId, ownerId, date, amount, tickets, itbms);
  }

  async recordOccupancy(
    tripId: string,
    busId: string,
    totalSeats: number,
    occupiedSeats: number
  ): Promise<void> {
    await this.analyticsRepository.recordOccupancy(tripId, busId, totalSeats, occupiedSeats);
  }
}

