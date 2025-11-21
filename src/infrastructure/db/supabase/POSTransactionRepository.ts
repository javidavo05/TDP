import { POSTransaction } from "@/domain/entities";
import { IPOSTransactionRepository } from "@/domain/repositories/IPOSTransactionRepository";
import { createClient } from "@/lib/supabase/server";

export class POSTransactionRepository implements IPOSTransactionRepository {
  async findById(id: string): Promise<POSTransaction | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pos_transactions")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findBySession(sessionId: string): Promise<POSTransaction[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pos_transactions")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to find transactions: ${error.message}`);
    return (data || []).map((d: any) => this.mapToEntity(d));
  }

  async findByTerminalAndDate(terminalId: string, date: Date): Promise<POSTransaction[]> {
    const supabase = await createClient();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("pos_transactions")
      .select("*")
      .eq("terminal_id", terminalId)
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to find transactions: ${error.message}`);
    return (data || []).map((d: any) => this.mapToEntity(d));
  }

  async findByTicket(ticketId: string): Promise<POSTransaction | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pos_transactions")
      .select("*")
      .eq("ticket_id", ticketId)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async create(transaction: POSTransaction): Promise<POSTransaction> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pos_transactions")
      .insert(this.mapToDatabase(transaction))
      .select()
      .single();

    if (error) throw new Error(`Failed to create transaction: ${error.message}`);
    return this.mapToEntity(data);
  }

  private mapToEntity(data: any): POSTransaction {
    return new POSTransaction(
      data.id,
      data.session_id,
      data.terminal_id,
      data.ticket_id,
      data.payment_id,
      data.transaction_type,
      parseFloat(data.amount),
      data.payment_method,
      data.received_amount ? parseFloat(data.received_amount) : null,
      parseFloat(data.change_amount || "0"),
      data.processed_by_user_id,
      new Date(data.created_at)
    );
  }

  private mapToDatabase(transaction: POSTransaction): any {
    return {
      id: transaction.id,
      session_id: transaction.sessionId,
      terminal_id: transaction.terminalId,
      ticket_id: transaction.ticketId,
      payment_id: transaction.paymentId,
      transaction_type: transaction.transactionType,
      amount: transaction.amount.toString(),
      payment_method: transaction.paymentMethod,
      received_amount: transaction.receivedAmount?.toString() || null,
      change_amount: transaction.changeAmount.toString(),
      processed_by_user_id: transaction.processedByUserId,
    };
  }
}

