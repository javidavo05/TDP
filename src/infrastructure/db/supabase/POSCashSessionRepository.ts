import { POSCashSession } from "@/domain/entities";
import { IPOSCashSessionRepository } from "@/domain/repositories/IPOSCashSessionRepository";
import { createClient } from "@/lib/supabase/server";

export class POSCashSessionRepository implements IPOSCashSessionRepository {
  async findById(id: string): Promise<POSCashSession | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pos_cash_sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findActiveByTerminal(terminalId: string): Promise<POSCashSession | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pos_cash_sessions")
      .select("*")
      .eq("terminal_id", terminalId)
      .is("closed_at", null)
      .order("opened_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findByTerminalAndDate(terminalId: string, date: Date): Promise<POSCashSession[]> {
    const supabase = await createClient();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("pos_cash_sessions")
      .select("*")
      .eq("terminal_id", terminalId)
      .gte("opened_at", startOfDay.toISOString())
      .lte("opened_at", endOfDay.toISOString())
      .order("opened_at", { ascending: false });

    if (error) throw new Error(`Failed to find sessions: ${error.message}`);
    return (data || []).map((d: any) => this.mapToEntity(d));
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<POSCashSession[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pos_cash_sessions")
      .select("*")
      .gte("opened_at", startDate.toISOString())
      .lte("opened_at", endDate.toISOString())
      .order("opened_at", { ascending: false });

    if (error) throw new Error(`Failed to find sessions: ${error.message}`);
    return (data || []).map((d: any) => this.mapToEntity(d));
  }

  async create(session: POSCashSession): Promise<POSCashSession> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pos_cash_sessions")
      .insert(this.mapToDatabase(session))
      .select()
      .single();

    if (error) throw new Error(`Failed to create cash session: ${error.message}`);
    return this.mapToEntity(data);
  }

  async update(session: POSCashSession): Promise<POSCashSession> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pos_cash_sessions")
      .update(this.mapToDatabase(session))
      .eq("id", session.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update cash session: ${error.message}`);
    return this.mapToEntity(data);
  }

  private mapToEntity(data: any): POSCashSession {
    // Handle backward compatibility - new columns may not exist yet
    const countedTotal = data.counted_total !== undefined && data.counted_total !== null 
      ? parseFloat(data.counted_total) 
      : null;
    const manualTotal = data.manual_total !== undefined && data.manual_total !== null 
      ? parseFloat(data.manual_total) 
      : null;
    const countDiscrepancy = data.count_discrepancy !== undefined && data.count_discrepancy !== null
      ? parseFloat(data.count_discrepancy)
      : 0;
    const discrepancyNotes = data.discrepancy_notes !== undefined 
      ? data.discrepancy_notes 
      : null;

    return new POSCashSession(
      data.id,
      data.terminal_id,
      data.opened_by_user_id,
      new Date(data.opened_at),
      data.closed_at ? new Date(data.closed_at) : null,
      parseFloat(data.initial_cash || "0"),
      parseFloat(data.expected_cash || "0"),
      data.actual_cash ? parseFloat(data.actual_cash) : null,
      parseFloat(data.total_sales || "0"),
      parseFloat(data.total_cash_sales || "0"),
      parseFloat(data.total_card_sales || "0"),
      data.total_tickets || 0,
      data.closure_type,
      data.notes,
      countedTotal,
      manualTotal,
      countDiscrepancy,
      discrepancyNotes,
      new Date(data.created_at),
      new Date(data.updated_at)
    );
  }

  private mapToDatabase(session: POSCashSession): any {
    const data: any = {
      id: session.id,
      terminal_id: session.terminalId,
      opened_by_user_id: session.openedByUserId,
      opened_at: session.openedAt.toISOString(),
      closed_at: session.closedAt?.toISOString() || null,
      initial_cash: session.initialCash.toString(),
      expected_cash: session.expectedCash.toString(),
      actual_cash: session.actualCash?.toString() || null,
      total_sales: session.totalSales.toString(),
      total_cash_sales: session.totalCashSales.toString(),
      total_card_sales: session.totalCardSales.toString(),
      total_tickets: session.totalTickets,
      closure_type: session.closureType,
      notes: session.notes,
    };

    // Only include new columns if they exist (for backward compatibility)
    if (session.countedTotal !== null && session.countedTotal !== undefined) {
      data.counted_total = session.countedTotal.toString();
    }
    if (session.manualTotal !== null && session.manualTotal !== undefined) {
      data.manual_total = session.manualTotal.toString();
    }
    if (session.countDiscrepancy !== null && session.countDiscrepancy !== undefined) {
      data.count_discrepancy = session.countDiscrepancy.toString();
    }
    if (session.discrepancyNotes !== null && session.discrepancyNotes !== undefined) {
      data.discrepancy_notes = session.discrepancyNotes;
    }

    return data;
  }
}

