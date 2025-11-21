import { Trip } from "@/domain/entities";
import { ITripRepository } from "@/domain/repositories";
import { TripSearchFilters, PaginationParams, PaginatedResponse, TripStatus } from "@/domain/types";
import { createClient } from "@/lib/supabase/server";

export class TripRepository implements ITripRepository {
  async findById(id: string): Promise<Trip | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async search(
    filters: TripSearchFilters,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Trip>> {
    const supabase = await createClient();
    let query = supabase.from("trips").select("*, routes(*), buses(*)", { count: "exact" });

    if (filters.origin || filters.destination) {
      query = query.eq("routes.origin", filters.origin || "");
      if (filters.destination) {
        query = query.eq("routes.destination", filters.destination);
      }
    }

    if (filters.date) {
      // Use UTC to avoid timezone issues
      const startOfDay = new Date(filters.date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      console.log(`[TripRepository.search] Filtering by date: ${filters.date} (${startOfDay.toISOString()} to ${endOfDay.toISOString()})`);

      query = query
        .gte("departure_time", startOfDay.toISOString())
        .lte("departure_time", endOfDay.toISOString());
    }

    if (filters.minPrice) {
      query = query.gte("price", filters.minPrice);
    }

    if (filters.maxPrice) {
      query = query.lte("price", filters.maxPrice);
    }

    query = query.in("status", ["scheduled", "boarding"]);

    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    query = query.range(offset, offset + limit - 1).order("departure_time", { ascending: true });

    const { data, error, count } = await query;

    if (error) throw new Error(`Failed to search trips: ${error.message}`);

    return {
      data: (data || []).map((d: any) => this.mapToEntity(d)),
      total: count || 0,
      page: params?.page || 1,
      limit,
      hasMore: (count || 0) > offset + limit,
    };
  }

  async findByRoute(routeId: string, date?: Date): Promise<Trip[]> {
    const supabase = await createClient();
    let query = supabase.from("trips").select("*").eq("route_id", routeId);

    if (date) {
      // Use UTC to avoid timezone issues
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      query = query
        .gte("departure_time", startOfDay.toISOString())
        .lte("departure_time", endOfDay.toISOString());
    }

    const { data, error } = await query.order("departure_time", { ascending: true });

    if (error) throw new Error(`Failed to find trips by route: ${error.message}`);
    return (data || []).map((d: any) => this.mapToEntity(d));
  }

  async findByBus(busId: string, params?: PaginationParams): Promise<PaginatedResponse<Trip>> {
    const supabase = await createClient();
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    const { data, error, count } = await supabase
      .from("trips")
      .select("*", { count: "exact" })
      .eq("bus_id", busId)
      .range(offset, offset + limit - 1)
      .order("departure_time", { ascending: false });

    if (error) throw new Error(`Failed to find trips by bus: ${error.message}`);

    return {
      data: (data || []).map((d: any) => this.mapToEntity(d)),
      total: count || 0,
      page: params?.page || 1,
      limit,
      hasMore: (count || 0) > offset + limit,
    };
  }

  async findByOwner(ownerId: string, params?: PaginationParams): Promise<PaginatedResponse<Trip>> {
    const supabase = await createClient();
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    // First get all bus IDs for this owner
    const { data: buses, error: busesError } = await supabase
      .from("buses")
      .select("id")
      .eq("owner_id", ownerId);

    if (busesError) throw new Error(`Failed to find buses by owner: ${busesError.message}`);

    if (!buses || buses.length === 0) {
      return {
        data: [],
        total: 0,
        page: params?.page || 1,
        limit,
        hasMore: false,
      };
    }

    const busIds = buses.map((b) => b.id);

    const { data, error, count } = await supabase
      .from("trips")
      .select("*", { count: "exact" })
      .in("bus_id", busIds)
      .range(offset, offset + limit - 1)
      .order("departure_time", { ascending: false });

    if (error) throw new Error(`Failed to find trips by owner: ${error.message}`);

    return {
      data: (data || []).map((d: any) => this.mapToEntity(d)),
      total: count || 0,
      page: params?.page || 1,
      limit,
      hasMore: (count || 0) > offset + limit,
    };
  }

  async findUpcoming(hours: number = 24): Promise<Trip[]> {
    const supabase = await createClient();
    const now = new Date();
    const future = new Date(now.getTime() + hours * 60 * 60 * 1000);

    console.log(`[TripRepository] Finding upcoming trips: from ${now.toISOString()} to ${future.toISOString()}`);

    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .gte("departure_time", now.toISOString())
      .lte("departure_time", future.toISOString())
      .in("status", ["scheduled", "boarding"])
      .order("departure_time", { ascending: true });

    if (error) {
      console.error(`[TripRepository] Error finding upcoming trips:`, error);
      throw new Error(`Failed to find upcoming trips: ${error.message}`);
    }

    console.log(`[TripRepository] Found ${data?.length || 0} upcoming trips`);
    return (data || []).map((d: any) => this.mapToEntity(d));
  }

  async create(trip: Trip): Promise<Trip> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("trips")
      .insert(this.mapToDatabase(trip))
      .select()
      .single();

    if (error) throw new Error(`Failed to create trip: ${error.message}`);
    return this.mapToEntity(data);
  }

  async update(trip: Trip): Promise<Trip> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("trips")
      .update(this.mapToDatabase(trip))
      .eq("id", trip.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update trip: ${error.message}`);
    return this.mapToEntity(data);
  }

  async updateLocation(tripId: string, location: { latitude: number; longitude: number; lastUpdate: Date }): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("trips")
      .update({
        current_latitude: location.latitude,
        current_longitude: location.longitude,
        location_updated_at: location.lastUpdate.toISOString(),
      })
      .eq("id", tripId);

    if (error) throw new Error(`Failed to update trip location: ${error.message}`);
  }

  async delete(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("trips").delete().eq("id", id);

    if (error) throw new Error(`Failed to delete trip: ${error.message}`);
  }

  private mapToEntity(data: any): Trip {
    return new Trip(
      data.id,
      data.bus_id,
      data.route_id,
      new Date(data.departure_time),
      data.arrival_estimate ? new Date(data.arrival_estimate) : null,
      data.status as TripStatus,
      data.current_stop_id,
      data.available_seats,
      data.total_seats,
      parseFloat(data.price),
      new Date(data.created_at),
      new Date(data.updated_at)
    );
  }

  private mapToDatabase(trip: Trip): any {
    return {
      id: trip.id,
      bus_id: trip.busId,
      route_id: trip.routeId,
      departure_time: trip.departureTime.toISOString(),
      arrival_estimate: trip.arrivalEstimate?.toISOString() || null,
      status: trip.status,
      current_stop_id: trip.currentStopId,
      available_seats: trip.availableSeats,
      total_seats: trip.totalSeats,
      price: trip.price.toString(),
    };
  }
}

