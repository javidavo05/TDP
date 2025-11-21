import { POSTerminal } from "@/domain/entities";
import { IPOSTerminalRepository } from "@/domain/repositories/IPOSTerminalRepository";
import { PaginationParams, PaginatedResponse } from "@/domain/types";
import { createClient } from "@/lib/supabase/server";

export class POSTerminalRepository implements IPOSTerminalRepository {
  async findById(id: string): Promise<POSTerminal | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pos_terminals")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findByLocationCode(locationCode: string): Promise<POSTerminal | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pos_terminals")
      .select("*")
      .eq("location_code", locationCode)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findByAssignedUser(userId: string): Promise<POSTerminal | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pos_terminals")
      .select("*")
      .eq("assigned_user_id", userId)
      .eq("is_active", true)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResponse<POSTerminal>> {
    const supabase = await createClient();
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    const { data, error, count } = await supabase
      .from("pos_terminals")
      .select("*", { count: "exact" })
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to find POS terminals: ${error.message}`);

    return {
      data: (data || []).map((d: any) => this.mapToEntity(d)),
      total: count || 0,
      page: params?.page || 1,
      limit,
      hasMore: (count || 0) > offset + limit,
    };
  }

  async findOpenTerminals(): Promise<POSTerminal[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pos_terminals")
      .select("*")
      .eq("is_open", true)
      .eq("is_active", true);

    if (error) throw new Error(`Failed to find open terminals: ${error.message}`);
    return (data || []).map((d: any) => this.mapToEntity(d));
  }

  async create(terminal: POSTerminal): Promise<POSTerminal> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pos_terminals")
      .insert(this.mapToDatabase(terminal))
      .select()
      .single();

    if (error) throw new Error(`Failed to create POS terminal: ${error.message}`);
    return this.mapToEntity(data);
  }

  async update(terminal: POSTerminal): Promise<POSTerminal> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pos_terminals")
      .update(this.mapToDatabase(terminal))
      .eq("id", terminal.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update POS terminal: ${error.message}`);
    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("pos_terminals").delete().eq("id", id);

    if (error) throw new Error(`Failed to delete POS terminal: ${error.message}`);
  }

  private mapToEntity(data: any): POSTerminal {
    return new POSTerminal(
      data.id,
      data.terminal_identifier,
      data.physical_location,
      data.location_code,
      data.assigned_user_id,
      parseFloat(data.initial_cash_amount || "0"),
      parseFloat(data.current_cash_amount || "0"),
      data.is_open || false,
      data.last_opened_at ? new Date(data.last_opened_at) : null,
      data.last_closed_at ? new Date(data.last_closed_at) : null,
      data.opened_by_user_id,
      data.is_active,
      new Date(data.created_at),
      new Date(data.updated_at)
    );
  }

  private mapToDatabase(terminal: POSTerminal): any {
    return {
      id: terminal.id,
      terminal_identifier: terminal.terminalIdentifier,
      physical_location: terminal.physicalLocation,
      location_code: terminal.locationCode,
      assigned_user_id: terminal.assignedUserId,
      initial_cash_amount: terminal.initialCashAmount.toString(),
      current_cash_amount: terminal.currentCashAmount.toString(),
      is_open: terminal.isOpen,
      last_opened_at: terminal.lastOpenedAt?.toISOString() || null,
      last_closed_at: terminal.lastClosedAt?.toISOString() || null,
      opened_by_user_id: terminal.openedByUserId,
      is_active: terminal.isActive,
    };
  }
}

