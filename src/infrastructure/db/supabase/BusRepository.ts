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
    
    // Try to insert - first attempt with optional fields if they have values
    let insertData = this.mapToDatabase(bus, true);
    let { data, error } = await supabase
      .from("buses")
      .insert(insertData)
      .select()
      .single();

    // If error is about optional columns not existing, retry without them
    if (error) {
      const errorMessage = (error?.message || "").toLowerCase();
      const errorCode = error?.code || "";
      const isSchemaCacheError = (
        errorMessage.includes("mechanical_notes") || 
        errorMessage.includes("unit_number") ||
        errorMessage.includes("schema cache") ||
        errorMessage.includes("could not find") ||
        errorMessage.includes("column") ||
        errorCode === "PGRST116" ||
        errorCode === "42703"
      );

      if (isSchemaCacheError) {
        console.warn("Optional columns not found in schema cache, retrying without them. Error:", error.message);
        
        // Retry without optional fields
        insertData = this.mapToDatabase(bus, false);
        const retryResult = await supabase
          .from("buses")
          .insert(insertData)
          .select()
          .single();
        
        if (retryResult.error) {
          console.error("Retry without optional fields also failed:", retryResult.error);
          throw new Error(`Failed to create bus: ${retryResult.error.message}`);
        }
        
        data = retryResult.data;
        console.log("Bus created successfully without optional fields");
      } else {
        // Non-schema-cache error, throw it
        throw new Error(`Failed to create bus: ${error.message}`);
      }
    }

    return this.mapToEntity(data);
  }

  async update(bus: Bus): Promise<Bus> {
    const supabase = await createClient();
    const updateData = this.mapToDatabase(bus, true);
    // Remove id from update data as it shouldn't be updated
    delete updateData.id;
    
    let { data, error } = await supabase
      .from("buses")
      .update(updateData)
      .eq("id", bus.id)
      .select()
      .single();

    // If error is about optional columns not existing, retry without them
    const errorMessage = error?.message || "";
    const isSchemaCacheError = (
      errorMessage.includes("mechanical_notes") || 
      errorMessage.includes("unit_number") ||
      errorMessage.includes("schema cache") ||
      errorMessage.includes("Could not find") ||
      errorMessage.includes("column") ||
      error?.code === "PGRST116" ||
      error?.code === "42703" // PostgreSQL undefined column error
    );

    if (error && isSchemaCacheError) {
      console.warn("Optional columns (unit_number/mechanical_notes) not found in schema cache, retrying without them. Original error:", errorMessage);
      const updateDataWithoutOptionalFields = this.mapToDatabase(bus, false);
      delete updateDataWithoutOptionalFields.id;
      const retryResult = await supabase
        .from("buses")
        .update(updateDataWithoutOptionalFields)
        .eq("id", bus.id)
        .select()
        .single();
      
      if (retryResult.error) {
        console.error("Retry without optional fields also failed:", retryResult.error);
        throw new Error(`Failed to update bus: ${retryResult.error.message}`);
      }
      
      data = retryResult.data;
      console.log("Bus updated successfully without optional fields");
    } else if (error) {
      throw new Error(`Failed to update bus: ${error.message}`);
    }

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
      data.unit_number || null,
      data.model,
      data.year,
      data.capacity,
      data.seat_map as SeatMap,
      data.bus_class as BusClass,
      (data.features || {}) as BusFeatures,
      data.mechanical_notes || null,
      data.is_active,
      new Date(data.created_at),
      new Date(data.updated_at),
      parseFloat(data.odometer || 0),
      parseFloat(data.total_distance_traveled || 0),
      data.last_trip_date ? new Date(data.last_trip_date) : null
    );
  }

  private mapToDatabase(bus: Bus, includeOptionalFields: boolean = true): any {
    const data: any = {
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
    
    // Only include optional fields if flag is true and values are provided
    // This allows the code to work even if the columns don't exist yet
    if (includeOptionalFields) {
      if (bus.unitNumber !== undefined && bus.unitNumber !== null) {
        data.unit_number = bus.unitNumber;
      }
      if (bus.odometer !== undefined) {
        data.odometer = bus.odometer;
      }
      if (bus.totalDistanceTraveled !== undefined) {
        data.total_distance_traveled = bus.totalDistanceTraveled;
      }
      if (bus.lastTripDate !== undefined && bus.lastTripDate !== null) {
        data.last_trip_date = bus.lastTripDate.toISOString();
      }
      if (bus.mechanicalNotes !== undefined && bus.mechanicalNotes !== null) {
        data.mechanical_notes = bus.mechanicalNotes;
      }
    }

    return data;
  }
}

