import { createClient } from "@/lib/supabase/server";
import { BusAssignmentChange } from "@/domain/entities";
import { IBusAssignmentChangeRepository } from "@/domain/repositories/IBusAssignmentChangeRepository";

export class BusAssignmentChangeRepository implements IBusAssignmentChangeRepository {
  async findById(id: string): Promise<BusAssignmentChange | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("bus_assignment_changes")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findByAssignmentId(assignmentId: string): Promise<BusAssignmentChange[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("bus_assignment_changes")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("changed_at", { ascending: false });

    if (error || !data) return [];
    return data.map((row) => this.mapToEntity(row));
  }

  async findByBusId(busId: string): Promise<BusAssignmentChange[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("bus_assignment_changes")
      .select("*")
      .or(`old_bus_id.eq.${busId},new_bus_id.eq.${busId}`)
      .order("changed_at", { ascending: false });

    if (error || !data) return [];
    return data.map((row) => this.mapToEntity(row));
  }

  async findByChangedBy(userId: string): Promise<BusAssignmentChange[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("bus_assignment_changes")
      .select("*")
      .eq("changed_by", userId)
      .order("changed_at", { ascending: false });

    if (error || !data) return [];
    return data.map((row) => this.mapToEntity(row));
  }

  async create(change: BusAssignmentChange): Promise<BusAssignmentChange> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("bus_assignment_changes")
      .insert(this.mapToDatabase(change))
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create assignment change: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  private mapToEntity(row: any): BusAssignmentChange {
    return new BusAssignmentChange(
      row.id,
      row.assignment_id,
      row.old_bus_id,
      row.new_bus_id,
      row.reason,
      row.changed_by,
      new Date(row.changed_at),
      new Date(row.created_at)
    );
  }

  private mapToDatabase(change: BusAssignmentChange): any {
    return {
      id: change.id,
      assignment_id: change.assignmentId,
      old_bus_id: change.oldBusId,
      new_bus_id: change.newBusId,
      reason: change.reason,
      changed_by: change.changedBy,
      changed_at: change.changedAt.toISOString(),
      created_at: change.createdAt.toISOString(),
    };
  }
}

