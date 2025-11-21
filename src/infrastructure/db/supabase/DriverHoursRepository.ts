import { DriverHours } from "@/domain/entities/DriverHours";
import { IDriverHoursRepository } from "@/domain/repositories/IDriverHoursRepository";
import { PaginationParams, PaginatedResponse } from "@/domain/types";
import { createClient } from "@/lib/supabase/server";

export class DriverHoursRepository implements IDriverHoursRepository {
  async findById(id: string): Promise<DriverHours | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("driver_hours_tracking")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findByDriver(driverId: string, params?: PaginationParams): Promise<PaginatedResponse<DriverHours>> {
    const supabase = await createClient();
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    const { data, error, count } = await supabase
      .from("driver_hours_tracking")
      .select("*", { count: "exact" })
      .eq("driver_id", driverId)
      .range(offset, offset + limit - 1)
      .order("date", { ascending: false })
      .order("start_time", { ascending: false });

    if (error) throw new Error(`Failed to find driver hours: ${error.message}`);

    return {
      data: (data || []).map((d: any) => this.mapToEntity(d)),
      total: count || 0,
      page: params?.page || 1,
      limit,
      hasMore: (count || 0) > offset + limit,
    };
  }

  async findByDriverAndDate(driverId: string, date: Date): Promise<DriverHours[]> {
    const supabase = await createClient();
    const dateStr = date.toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("driver_hours_tracking")
      .select("*")
      .eq("driver_id", driverId)
      .eq("date", dateStr)
      .order("start_time", { ascending: false });

    if (error) throw new Error(`Failed to find driver hours by date: ${error.message}`);
    return (data || []).map((d: any) => this.mapToEntity(d));
  }

  async findByDriverAndDateRange(driverId: string, startDate: Date, endDate: Date): Promise<DriverHours[]> {
    const supabase = await createClient();
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("driver_hours_tracking")
      .select("*")
      .eq("driver_id", driverId)
      .gte("date", startStr)
      .lte("date", endStr)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw new Error(`Failed to find driver hours by date range: ${error.message}`);
    return (data || []).map((d: any) => this.mapToEntity(d));
  }

  async findByTrip(tripId: string): Promise<DriverHours | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("driver_hours_tracking")
      .select("*")
      .eq("trip_id", tripId)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async create(hours: DriverHours): Promise<DriverHours> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("driver_hours_tracking")
      .insert(this.mapToDatabase(hours))
      .select()
      .single();

    if (error) throw new Error(`Failed to create driver hours: ${error.message}`);
    return this.mapToEntity(data);
  }

  async update(hours: DriverHours): Promise<DriverHours> {
    const supabase = await createClient();
    const updateData = this.mapToDatabase(hours);
    delete updateData.id;

    const { data, error } = await supabase
      .from("driver_hours_tracking")
      .update(updateData)
      .eq("id", hours.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update driver hours: ${error.message}`);
    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("driver_hours_tracking")
      .delete()
      .eq("id", id);

    if (error) throw new Error(`Failed to delete driver hours: ${error.message}`);
  }

  private mapToEntity(data: any): DriverHours {
    return new DriverHours(
      data.id,
      data.driver_id,
      data.trip_id,
      new Date(data.start_time),
      data.end_time ? new Date(data.end_time) : null,
      parseFloat(data.hours_worked || 0),
      new Date(data.date),
      new Date(data.created_at),
      new Date(data.updated_at)
    );
  }

  private mapToDatabase(hours: DriverHours): any {
    return {
      id: hours.id,
      driver_id: hours.driverId,
      trip_id: hours.tripId,
      start_time: hours.startTime.toISOString(),
      end_time: hours.endTime?.toISOString() || null,
      hours_worked: hours.hoursWorked,
      date: hours.date.toISOString().split("T")[0],
    };
  }
}

