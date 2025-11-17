import { IAnalyticsRepository } from "@/domain/repositories";
import { RevenueReport, OccupancyMetrics } from "@/domain/types";
import { createClient } from "@/lib/supabase/server";

export class AnalyticsRepository implements IAnalyticsRepository {
  async getDailyRevenue(busId: string, date: Date): Promise<RevenueReport | null> {
    const supabase = await createClient();
    const dateStr = date.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("daily_bus_revenue")
      .select("*")
      .eq("bus_id", busId)
      .eq("date", dateStr)
      .single();

    if (error || !data) return null;

    return {
      totalRevenue: parseFloat(data.total_revenue),
      totalTickets: data.total_tickets,
      totalITBMS: parseFloat(data.total_itbms),
      period: {
        start: new Date(data.date),
        end: new Date(data.date),
      },
    };
  }

  async getOwnerRevenue(
    ownerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<RevenueReport> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("daily_bus_revenue")
      .select("*")
      .eq("owner_id", ownerId)
      .gte("date", startDate.toISOString().split("T")[0])
      .lte("date", endDate.toISOString().split("T")[0]);

    if (error) {
      throw new Error(`Failed to get owner revenue: ${error.message}`);
    }

    const totalRevenue = (data || []).reduce(
      (sum, d) => sum + parseFloat(d.total_revenue),
      0
    );
    const totalTickets = (data || []).reduce((sum, d) => sum + d.total_tickets, 0);
    const totalITBMS = (data || []).reduce((sum, d) => sum + parseFloat(d.total_itbms), 0);

    return {
      totalRevenue,
      totalTickets,
      totalITBMS,
      period: {
        start: startDate,
        end: endDate,
      },
    };
  }

  async getTripOccupancy(tripId: string): Promise<OccupancyMetrics | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("occupancy_metrics")
      .select("*")
      .eq("trip_id", tripId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    return {
      totalSeats: data.total_seats,
      occupiedSeats: data.occupied_seats,
      occupancyPercentage: parseFloat(data.occupancy_percentage),
      recordedAt: new Date(data.recorded_at),
    };
  }

  async getRouteUsage(routeId: string, date: Date): Promise<number> {
    const supabase = await createClient();
    const dateStr = date.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("route_usage")
      .select("total_passengers")
      .eq("route_id", routeId)
      .eq("date", dateStr)
      .single();

    if (error || !data) return 0;

    return data.total_passengers;
  }

  async updateDailyRevenue(
    busId: string,
    ownerId: string,
    date: Date,
    amount: number,
    tickets: number,
    itbms: number
  ): Promise<void> {
    const supabase = await createClient();
    const dateStr = date.toISOString().split("T")[0];

    const { error } = await supabase.from("daily_bus_revenue").upsert(
      {
        bus_id: busId,
        owner_id: ownerId,
        date: dateStr,
        total_revenue: amount.toString(),
        total_tickets: tickets,
        total_itbms: itbms.toString(),
      },
      {
        onConflict: "bus_id,date",
      }
    );

    if (error) {
      throw new Error(`Failed to update daily revenue: ${error.message}`);
    }
  }

  async recordOccupancy(
    tripId: string,
    busId: string,
    totalSeats: number,
    occupiedSeats: number
  ): Promise<void> {
    const supabase = await createClient();
    const occupancyPercentage = (occupiedSeats / totalSeats) * 100;

    const { error } = await supabase.from("occupancy_metrics").insert({
      trip_id: tripId,
      bus_id: busId,
      total_seats: totalSeats,
      occupied_seats: occupiedSeats,
      occupancy_percentage: occupancyPercentage.toString(),
    });

    if (error) {
      throw new Error(`Failed to record occupancy: ${error.message}`);
    }
  }
}

