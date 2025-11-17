import { Bus } from "@/domain/entities";
import { IBusRepository } from "@/domain/repositories";
import { PaginationParams, PaginatedResponse, BusClass, SeatMap, BusFeatures } from "@/domain/types";
import { createClient } from "@/lib/supabase/server";

export class BusRepository implements IBusRepository {
  async findById(id: string): Promise<Bus | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("buses")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findByOwner(ownerId: string, params?: PaginationParams): Promise<PaginatedResponse<Bus>> {
    const supabase = await createClient();
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    const { data, error, count } = await supabase
      .from("buses")
      .select("*", { count: "exact" })
      .eq("owner_id", ownerId)
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to find buses by owner: ${error.message}`);

    return {
      data: (data || []).map((d: any) => this.mapToEntity(d)),
      total: count || 0,
      page: params?.page || 1,
      limit,
      hasMore: (count || 0) > offset + limit,
    };
  }

  async findByPlate(plateNumber: string): Promise<Bus | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("buses")
      .select("*")
      .eq("plate_number", plateNumber)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResponse<Bus>> {
    const supabase = await createClient();
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    const { data, error, count } = await supabase
      .from("buses")
      .select("*", { count: "exact" })
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to find buses: ${error.message}`);

    return {
      data: (data || []).map((d: any) => this.mapToEntity(d)),
      total: count || 0,
      page: params?.page || 1,
      limit,
      hasMore: (count || 0) > offset + limit,
    };
  }

  async create(bus: Bus): Promise<Bus> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("buses")
      .insert(this.mapToDatabase(bus))
      .select()
      .single();

    if (error) throw new Error(`Failed to create bus: ${error.message}`);
    return this.mapToEntity(data);
  }

  async update(bus: Bus): Promise<Bus> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("buses")
      .update(this.mapToDatabase(bus))
      .eq("id", bus.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update bus: ${error.message}`);
    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("buses").delete().eq("id", id);

    if (error) throw new Error(`Failed to delete bus: ${error.message}`);
  }

  async findActive(): Promise<Bus[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("buses")
      .select("*")
      .eq("is_active", true);

    if (error) throw new Error(`Failed to find active buses: ${error.message}`);
    return (data || []).map((d: any) => this.mapToEntity(d));
  }

  private mapToEntity(data: any): Bus {
    return new Bus(
      data.id,
      data.owner_id,
      data.preset_id,
      data.plate_number,
      data.model,
      data.year,
      data.capacity,
      data.seat_map as SeatMap,
      data.bus_class as BusClass,
      (data.features || {}) as BusFeatures,
      data.is_active,
      new Date(data.created_at),
      new Date(data.updated_at)
    );
  }

  private mapToDatabase(bus: Bus): any {
    return {
      id: bus.id,
      owner_id: bus.ownerId,
      preset_id: bus.presetId,
      plate_number: bus.plateNumber,
      model: bus.model,
      year: bus.year,
      capacity: bus.capacity,
      seat_map: bus.seatMap,
      bus_class: bus.busClass,
      features: bus.features,
      is_active: bus.isActive,
    };
  }
}

