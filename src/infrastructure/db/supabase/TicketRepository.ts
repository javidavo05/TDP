import { Ticket } from "@/domain/entities";
import { ITicketRepository } from "@/domain/repositories";
import { PaginationParams, PaginatedResponse, TicketStatus } from "@/domain/types";
import { createClient } from "@/lib/supabase/server";

export class TicketRepository implements ITicketRepository {
  async findById(id: string): Promise<Ticket | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findByQRCode(qrCode: string): Promise<Ticket | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("qr_code", qrCode)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findByQRToken(token: string): Promise<Ticket | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("qr_token", token)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findByUser(userId: string, params?: PaginationParams): Promise<PaginatedResponse<Ticket>> {
    const supabase = await createClient();
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    const { data, error, count } = await supabase
      .from("tickets")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to find tickets by user: ${error.message}`);

    return {
      data: (data || []).map((d: any) => this.mapToEntity(d)),
      total: count || 0,
      page: params?.page || 1,
      limit,
      hasMore: (count || 0) > offset + limit,
    };
  }

  async findByTrip(tripId: string): Promise<Ticket[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("trip_id", tripId)
      .in("status", ["paid", "boarded", "completed"]);

    if (error) throw new Error(`Failed to find tickets by trip: ${error.message}`);
    return (data || []).map((d: any) => this.mapToEntity(d));
  }

  async findBySeat(seatId: string, tripId: string): Promise<Ticket | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("seat_id", seatId)
      .eq("trip_id", tripId)
      .in("status", ["pending", "paid", "boarded"])
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async create(ticket: Ticket): Promise<Ticket> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tickets")
      .insert(this.mapToDatabase(ticket))
      .select()
      .single();

    if (error) throw new Error(`Failed to create ticket: ${error.message}`);
    return this.mapToEntity(data);
  }

  async update(ticket: Ticket): Promise<Ticket> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tickets")
      .update(this.mapToDatabase(ticket))
      .eq("id", ticket.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update ticket: ${error.message}`);
    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("tickets").delete().eq("id", id);

    if (error) throw new Error(`Failed to delete ticket: ${error.message}`);
  }

  async countByTrip(tripId: string): Promise<number> {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("trip_id", tripId)
      .in("status", ["paid", "boarded", "completed"]);

    if (error) throw new Error(`Failed to count tickets: ${error.message}`);
    return count || 0;
  }

  private mapToEntity(data: any): Ticket {
    return new Ticket(
      data.id,
      data.user_id,
      data.trip_id,
      data.seat_id,
      data.qr_code,
      data.qr_token,
      data.status as TicketStatus,
      data.passenger_name,
      data.passenger_phone,
      data.passenger_email,
      data.boarding_stop_id,
      data.destination_stop_id,
      parseFloat(data.price),
      parseFloat(data.itbms),
      parseFloat(data.total_price),
      data.boarded_at ? new Date(data.boarded_at) : null,
      new Date(data.created_at),
      new Date(data.updated_at)
    );
  }

  private mapToDatabase(ticket: Ticket): any {
    return {
      id: ticket.id,
      user_id: ticket.userId,
      trip_id: ticket.tripId,
      seat_id: ticket.seatId,
      qr_code: ticket.qrCode,
      qr_token: ticket.qrToken,
      status: ticket.status,
      passenger_name: ticket.passengerName,
      passenger_phone: ticket.passengerPhone,
      passenger_email: ticket.passengerEmail,
      boarding_stop_id: ticket.boardingStopId,
      destination_stop_id: ticket.destinationStopId,
      price: ticket.price.toString(),
      itbms: ticket.itbms.toString(),
      total_price: ticket.totalPrice.toString(),
      boarded_at: ticket.boardedAt?.toISOString() || null,
    };
  }
}

