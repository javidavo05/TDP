import { DriverHoursConfig } from "@/domain/entities/DriverHoursConfig";
import { IDriverHoursConfigRepository } from "@/domain/repositories/IDriverHoursConfigRepository";
import { createClient } from "@/lib/supabase/server";

export class DriverHoursConfigRepository implements IDriverHoursConfigRepository {
  async getConfig(): Promise<DriverHoursConfig | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("driver_hours_config")
      .select("*")
      .limit(1)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async updateConfig(config: DriverHoursConfig): Promise<DriverHoursConfig> {
    const supabase = await createClient();
    const updateData = this.mapToDatabase(config);
    delete updateData.id;

    const { data, error } = await supabase
      .from("driver_hours_config")
      .update(updateData)
      .eq("id", config.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update driver hours config: ${error.message}`);
    return this.mapToEntity(data);
  }

  async createConfig(config: DriverHoursConfig): Promise<DriverHoursConfig> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("driver_hours_config")
      .insert(this.mapToDatabase(config))
      .select()
      .single();

    if (error) throw new Error(`Failed to create driver hours config: ${error.message}`);
    return this.mapToEntity(data);
  }

  private mapToEntity(data: any): DriverHoursConfig {
    return new DriverHoursConfig(
      data.id,
      parseFloat(data.max_hours_per_day),
      parseFloat(data.max_hours_per_week),
      parseFloat(data.max_hours_per_month),
      parseFloat(data.rest_hours_required),
      new Date(data.updated_at)
    );
  }

  private mapToDatabase(config: DriverHoursConfig): any {
    return {
      id: config.id,
      max_hours_per_day: config.maxHoursPerDay,
      max_hours_per_week: config.maxHoursPerWeek,
      max_hours_per_month: config.maxHoursPerMonth,
      rest_hours_required: config.restHoursRequired,
    };
  }
}

