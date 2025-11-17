import { Payment } from "@/domain/entities";
import { IPaymentRepository } from "@/domain/repositories";
import { PaymentStatus, PaymentMethod, PaginationParams, PaginatedResponse } from "@/domain/types";
import { createClient } from "@/lib/supabase/server";

export class PaymentRepository implements IPaymentRepository {
  async findById(id: string): Promise<Payment | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findByTicket(ticketId: string): Promise<Payment | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("ticket_id", ticketId)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findByTransactionId(transactionId: string): Promise<Payment | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("provider_transaction_id", transactionId)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findByStatus(
    status: PaymentStatus,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Payment>> {
    const supabase = await createClient();
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    const { data, error, count } = await supabase
      .from("payments")
      .select("*", { count: "exact" })
      .eq("status", status)
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to find payments by status: ${error.message}`);

    return {
      data: (data || []).map((d: any) => this.mapToEntity(d)),
      total: count || 0,
      page: params?.page || 1,
      limit,
      hasMore: (count || 0) > offset + limit,
    };
  }

  async create(payment: Payment): Promise<Payment> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payments")
      .insert(this.mapToDatabase(payment))
      .select()
      .single();

    if (error) throw new Error(`Failed to create payment: ${error.message}`);
    return this.mapToEntity(data);
  }

  async update(payment: Payment): Promise<Payment> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payments")
      .update(this.mapToDatabase(payment))
      .eq("id", payment.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update payment: ${error.message}`);
    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("payments").delete().eq("id", id);

    if (error) throw new Error(`Failed to delete payment: ${error.message}`);
  }

  private mapToEntity(data: any): Payment {
    return new Payment(
      data.id,
      data.ticket_id,
      data.payment_method as PaymentMethod,
      parseFloat(data.amount),
      parseFloat(data.itbms),
      parseFloat(data.total_amount),
      data.status as PaymentStatus,
      data.provider_transaction_id,
      data.provider_response,
      data.processed_at ? new Date(data.processed_at) : null,
      new Date(data.created_at),
      new Date(data.updated_at)
    );
  }

  private mapToDatabase(payment: Payment): any {
    return {
      id: payment.id,
      ticket_id: payment.ticketId,
      payment_method: payment.paymentMethod,
      amount: payment.amount.toString(),
      itbms: payment.itbms.toString(),
      total_amount: payment.totalAmount.toString(),
      status: payment.status,
      provider_transaction_id: payment.providerTransactionId,
      provider_response: payment.providerResponse,
      processed_at: payment.processedAt?.toISOString() || null,
    };
  }
}

