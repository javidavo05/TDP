import { ScheduleAssignment } from "@/domain/entities";
import { IScheduleAssignmentRepository } from "@/domain/repositories/IScheduleAssignmentRepository";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export class ScheduleAssignmentRepository implements IScheduleAssignmentRepository {
  async findById(id: string): Promise<ScheduleAssignment | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("schedule_assignments")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findByScheduleAndDate(scheduleId: string, date: Date): Promise<ScheduleAssignment[]> {
    // Use admin client to bypass RLS and ensure table access
    const supabase = createAdminClient();
    const dateStr = date.toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("schedule_assignments")
      .select("*")
      .eq("schedule_id", scheduleId)
      .eq("date", dateStr);

    if (error) {
      console.error("Error finding assignments by schedule and date:", error);
      throw new Error(`Failed to find assignments by schedule and date: ${error.message}`);
    }
    return (data || []).map((d: any) => this.mapToEntity(d));
  }

  async findByBusAndDate(busId: string, date: Date): Promise<ScheduleAssignment[]> {
    const supabase = await createClient();
    const dateStr = date.toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("schedule_assignments")
      .select("*")
      .eq("bus_id", busId)
      .eq("date", dateStr);

    if (error) throw new Error(`Failed to find assignments by bus and date: ${error.message}`);
    return (data || []).map((d: any) => this.mapToEntity(d));
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<ScheduleAssignment[]> {
    // Use admin client to bypass RLS and ensure table access
    const supabase = createAdminClient();
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("schedule_assignments")
      .select("*")
      .gte("date", startStr)
      .lte("date", endStr)
      .order("date", { ascending: true });

    if (error) {
      console.error("Error finding assignments by date range:", error);
      throw new Error(`Failed to find assignments by date range: ${error.message}`);
    }
    return (data || []).map((d: any) => this.mapToEntity(d));
  }

  async create(assignment: ScheduleAssignment): Promise<ScheduleAssignment> {
    // Use admin client to bypass RLS and ensure table access
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("schedule_assignments")
      .insert(this.mapToDatabase(assignment))
      .select()
      .single();

    if (error) {
      console.error("Error creating assignment:", error);
      throw new Error(`Failed to create assignment: ${error.message}`);
    }
    return this.mapToEntity(data);
  }

  async update(assignment: ScheduleAssignment): Promise<ScheduleAssignment> {
    // Use admin client to bypass RLS
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("schedule_assignments")
      .update({
        bus_id: assignment.busId,
        driver_id: assignment.driverId || null,
        assistant_id: assignment.assistantId || null,
        status: assignment.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignment.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update assignment: ${error.message}`);
    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<void> {
    // Use admin client to bypass RLS
    const supabase = createAdminClient();
    const { error } = await supabase.from("schedule_assignments").delete().eq("id", id);

    if (error) throw new Error(`Failed to delete assignment: ${error.message}`);
  }

  async deleteByScheduleAndBusAndDate(scheduleId: string, busId: string, date: Date): Promise<void> {
    // Use admin client to bypass RLS
    const supabase = createAdminClient();
    const dateStr = date.toISOString().split("T")[0];
    const { error } = await supabase
      .from("schedule_assignments")
      .delete()
      .eq("schedule_id", scheduleId)
      .eq("bus_id", busId)
      .eq("date", dateStr);

    if (error) throw new Error(`Failed to delete assignment: ${error.message}`);
  }

  private mapToEntity(data: any): ScheduleAssignment {
    return new ScheduleAssignment(
      data.id,
      data.schedule_id,
      data.bus_id,
      new Date(data.date),
      new Date(data.created_at),
      data.driver_id,
      data.assistant_id,
      data.status || 'assigned',
      data.updated_at ? new Date(data.updated_at) : undefined
    );
  }

  private mapToDatabase(assignment: ScheduleAssignment): any {
    return {
      id: assignment.id,
      schedule_id: assignment.scheduleId,
      bus_id: assignment.busId,
      date: assignment.date.toISOString().split("T")[0],
      driver_id: assignment.driverId || null,
      assistant_id: assignment.assistantId || null,
      status: assignment.status,
    };
  }
}

