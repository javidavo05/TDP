import { Passenger, DocumentType } from "@/domain/entities/Passenger";
import { IPassengerRepository } from "@/domain/repositories/IPassengerRepository";
import { PaginationParams, PaginatedResponse } from "@/domain/types";
import { createClient } from "@/lib/supabase/server";

export class PassengerRepository implements IPassengerRepository {
  async findById(id: string): Promise<Passenger | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("passengers")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findByDocumentId(documentId: string): Promise<Passenger | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("passengers")
      .select("*")
      .eq("document_id", documentId)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResponse<Passenger>> {
    const supabase = await createClient();
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    const { data, error, count } = await supabase
      .from("passengers")
      .select("*", { count: "exact" })
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to find passengers: ${error.message}`);

    return {
      data: (data || []).map((d: any) => this.mapToEntity(d)),
      total: count || 0,
      page: params?.page || 1,
      limit,
      hasMore: (count || 0) > offset + limit,
    };
  }

  async search(query: string, params?: PaginationParams): Promise<PaginatedResponse<Passenger>> {
    const supabase = await createClient();
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    const searchQuery = `%${query}%`;
    const { data, error, count } = await supabase
      .from("passengers")
      .select("*", { count: "exact" })
      .or(`full_name.ilike.${searchQuery},document_id.ilike.${searchQuery},phone.ilike.${searchQuery},email.ilike.${searchQuery}`)
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to search passengers: ${error.message}`);

    return {
      data: (data || []).map((d: any) => this.mapToEntity(d)),
      total: count || 0,
      page: params?.page || 1,
      limit,
      hasMore: (count || 0) > offset + limit,
    };
  }

  async create(passenger: Passenger): Promise<Passenger> {
    const supabase = await createClient();
    const passengerData = {
      id: passenger.id,
      document_id: passenger.documentId,
      document_type: passenger.documentType,
      full_name: passenger.fullName,
      phone: passenger.phone,
      email: passenger.email,
      date_of_birth: passenger.dateOfBirth?.toISOString().split("T")[0] || null,
      address: passenger.address,
    };

    const { data, error } = await supabase
      .from("passengers")
      .insert(passengerData)
      .select()
      .single();

    if (error) throw new Error(`Failed to create passenger: ${error.message}`);
    return this.mapToEntity(data);
  }

  async update(passenger: Passenger): Promise<Passenger> {
    const supabase = await createClient();
    const passengerData = {
      full_name: passenger.fullName,
      phone: passenger.phone,
      email: passenger.email,
      date_of_birth: passenger.dateOfBirth?.toISOString().split("T")[0] || null,
      address: passenger.address,
    };

    const { data, error } = await supabase
      .from("passengers")
      .update(passengerData)
      .eq("id", passenger.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update passenger: ${error.message}`);
    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("passengers").delete().eq("id", id);

    if (error) throw new Error(`Failed to delete passenger: ${error.message}`);
  }

  private mapToEntity(data: any): Passenger {
    return new Passenger(
      data.id,
      data.document_id,
      data.document_type as DocumentType,
      data.full_name,
      data.phone,
      data.email,
      data.date_of_birth ? new Date(data.date_of_birth) : null,
      data.address,
      new Date(data.created_at),
      new Date(data.updated_at),
      data.user_id || null,
      data.total_trips || 0,
      data.loyalty_points || 0,
      data.loyalty_tier || "bronze"
    );
  }
}

