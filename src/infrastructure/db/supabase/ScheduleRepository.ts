import { Schedule } from "@/domain/entities";
import { IScheduleRepository } from "@/domain/repositories/IScheduleRepository";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export class ScheduleRepository implements IScheduleRepository {
  async findById(id: string): Promise<Schedule | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findByRoute(routeId: string): Promise<Schedule[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .eq("route_id", routeId)
      .eq("is_active", true)
      .order("hour", { ascending: true });

    if (error) throw new Error(`Failed to find schedules by route: ${error.message}`);
    return (data || []).map((d: any) => this.mapToEntity(d));
  }

  async findByHour(hour: number): Promise<Schedule[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .eq("hour", hour)
      .eq("is_active", true);

    if (error) throw new Error(`Failed to find schedules by hour: ${error.message}`);
    return (data || []).map((d: any) => this.mapToEntity(d));
  }

  async create(schedule: Schedule): Promise<Schedule> {
    // Use admin client to bypass RLS and ensure table access
    const supabase = createAdminClient();
    
    // Try to create the schedule
    const { data, error } = await supabase
      .from("schedules")
      .insert(this.mapToDatabase(schedule))
      .select()
      .single();

    if (error) {
      console.error("Schedule creation error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      
      // If table not found error, try with explicit schema
      if (error.message?.includes("schema cache") || error.message?.includes("not found")) {
        // Retry with raw SQL query as fallback
        try {
          const { data: rawData, error: rawError } = await supabase.rpc('create_schedule', {
            p_route_id: schedule.routeId,
            p_hour: schedule.hour,
            p_is_express: schedule.isExpress,
            p_express_price_multiplier: schedule.expressPriceMultiplier,
            p_is_active: schedule.isActive
          });
          
          if (rawError) {
            throw new Error(`Failed to create schedule (fallback): ${rawError.message}`);
          }
          
          // If RPC doesn't return data, fetch it
          if (!rawData) {
            const { data: fetchedData } = await supabase
              .from("schedules")
              .select("*")
              .eq("route_id", schedule.routeId)
              .eq("hour", schedule.hour)
              .eq("is_express", schedule.isExpress)
              .single();
            
            if (fetchedData) {
              return this.mapToEntity(fetchedData);
            }
          }
        } catch (rpcError) {
          // If RPC doesn't exist, continue with original error
          console.error("RPC fallback failed:", rpcError);
        }
      }
      
      throw new Error(`Failed to create schedule: ${error.message}`);
    }
    return this.mapToEntity(data);
  }

  async update(schedule: Schedule): Promise<Schedule> {
    // Use admin client to bypass RLS
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("schedules")
      .update(this.mapToDatabase(schedule))
      .eq("id", schedule.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update schedule: ${error.message}`);
    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<void> {
    // Use admin client to bypass RLS
    const supabase = createAdminClient();
    const { error } = await supabase.from("schedules").delete().eq("id", id);

    if (error) throw new Error(`Failed to delete schedule: ${error.message}`);
  }

  private mapToEntity(data: any): Schedule {
    return new Schedule(
      data.id,
      data.route_id,
      data.hour,
      data.is_express || false,
      parseFloat(data.express_price_multiplier || "1.0"),
      data.is_active,
      new Date(data.created_at),
      new Date(data.updated_at)
    );
  }

  private mapToDatabase(schedule: Schedule): any {
    return {
      id: schedule.id,
      route_id: schedule.routeId,
      hour: schedule.hour,
      is_express: schedule.isExpress,
      express_price_multiplier: schedule.expressPriceMultiplier.toString(),
      is_active: schedule.isActive,
    };
  }
}

