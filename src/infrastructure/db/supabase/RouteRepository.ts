import { Route } from "@/domain/entities/Route";
import { IRouteRepository, RouteStop } from "@/domain/repositories/IRouteRepository";
import { PaginationParams, PaginatedResponse } from "@/domain/types";
import { createClient } from "@/lib/supabase/server";

export class RouteRepository implements IRouteRepository {
  async findById(id: string): Promise<Route | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("routes")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResponse<Route>> {
    const supabase = await createClient();
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    const { data, error, count } = await supabase
      .from("routes")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to find routes: ${error.message}`);

    return {
      data: (data || []).map((d: any) => this.mapToEntity(d)),
      total: count || 0,
      page: params?.page || 1,
      limit,
      hasMore: (count || 0) > offset + limit,
    };
  }

  async findByOriginAndDestination(origin: string, destination: string): Promise<Route | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("routes")
      .select("*")
      .eq("origin", origin)
      .eq("destination", destination)
      .eq("is_active", true)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async create(route: Route): Promise<Route> {
    const supabase = await createClient();
    const routeData = {
      id: route.id,
      name: route.name,
      origin: route.origin,
      destination: route.destination,
      distance_km: route.distanceKm,
      estimated_duration_minutes: route.estimatedDurationMinutes,
      base_price: route.basePrice.toString(),
      is_express: route.isExpress,
      express_price_multiplier: route.expressPriceMultiplier.toString(),
      is_active: route.isActive,
    };

    const { data, error } = await supabase
      .from("routes")
      .insert(routeData)
      .select()
      .single();

    if (error) throw new Error(`Failed to create route: ${error.message}`);
    return this.mapToEntity(data);
  }

  async update(route: Route): Promise<Route> {
    const supabase = await createClient();
    const routeData = {
      name: route.name,
      origin: route.origin,
      destination: route.destination,
      distance_km: route.distanceKm,
      estimated_duration_minutes: route.estimatedDurationMinutes,
      base_price: route.basePrice.toString(),
      is_express: route.isExpress,
      express_price_multiplier: route.expressPriceMultiplier.toString(),
      is_active: route.isActive,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("routes")
      .update(routeData)
      .eq("id", route.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update route: ${error.message}`);
    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("routes").delete().eq("id", id);

    if (error) throw new Error(`Failed to delete route: ${error.message}`);
  }

  async getStops(routeId: string): Promise<RouteStop[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("route_stops")
      .select("*")
      .eq("route_id", routeId)
      .order("order_index", { ascending: true });

    if (error) throw new Error(`Failed to get stops: ${error.message}`);
    return (data || []).map((d: any) => this.mapToStop(d));
  }

  async addStop(routeId: string, stop: Omit<RouteStop, "id" | "routeId" | "createdAt">): Promise<RouteStop> {
    const supabase = await createClient();
    const stopData = {
      id: crypto.randomUUID(),
      route_id: routeId,
      name: stop.name,
      km_position: stop.kmPosition.toString(),
      order_index: stop.orderIndex,
      price: stop.price.toString(),
    };

    const { data, error } = await supabase
      .from("route_stops")
      .insert(stopData)
      .select()
      .single();

    if (error) throw new Error(`Failed to add stop: ${error.message}`);
    return this.mapToStop(data);
  }

  async updateStop(stopId: string, stop: Partial<RouteStop>): Promise<RouteStop> {
    const supabase = await createClient();
    const stopData: any = {};
    if (stop.name !== undefined) stopData.name = stop.name;
    if (stop.kmPosition !== undefined) stopData.km_position = stop.kmPosition.toString();
    if (stop.orderIndex !== undefined) stopData.order_index = stop.orderIndex;
    if (stop.price !== undefined) stopData.price = stop.price.toString();

    const { data, error } = await supabase
      .from("route_stops")
      .update(stopData)
      .eq("id", stopId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update stop: ${error.message}`);
    return this.mapToStop(data);
  }

  async deleteStop(stopId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("route_stops").delete().eq("id", stopId);

    if (error) throw new Error(`Failed to delete stop: ${error.message}`);
  }

  async reorderStops(routeId: string, stopIds: string[]): Promise<void> {
    const supabase = await createClient();
    
    // Update order_index for each stop
    const updates = stopIds.map((stopId, index) => 
      supabase
        .from("route_stops")
        .update({ order_index: index })
        .eq("id", stopId)
        .eq("route_id", routeId)
    );

    await Promise.all(updates);
  }

  private mapToEntity(data: any): Route {
    return new Route(
      data.id,
      data.name,
      data.origin,
      data.destination,
      data.distance_km ? parseFloat(data.distance_km) : null,
      data.estimated_duration_minutes || null,
      parseFloat(data.base_price),
      data.is_express || false,
      parseFloat(data.express_price_multiplier || "1.2"),
      data.is_active,
      new Date(data.created_at),
      new Date(data.updated_at)
    );
  }

  private mapToStop(data: any): RouteStop {
    return {
      id: data.id,
      routeId: data.route_id,
      name: data.name,
      kmPosition: parseFloat(data.km_position),
      orderIndex: data.order_index,
      price: parseFloat(data.price || "0"), // Complete ticket price for this stop
      createdAt: new Date(data.created_at),
    };
  }
}
