import { User } from "@/domain/entities";
import { IUserRepository } from "@/domain/repositories";
import { PaginationParams, PaginatedResponse } from "@/domain/types";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/domain/types";

export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findByEmail(email: string): Promise<User | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findByPhone(phone: string): Promise<User | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("phone", phone)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async create(user: User): Promise<User> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("users")
      .insert(this.mapToDatabase(user))
      .select()
      .single();

    if (error) throw new Error(`Failed to create user: ${error.message}`);
    return this.mapToEntity(data);
  }

  async update(user: User): Promise<User> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("users")
      .update(this.mapToDatabase(user))
      .eq("id", user.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update user: ${error.message}`);
    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) throw new Error(`Failed to delete user: ${error.message}`);
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResponse<User>> {
    const supabase = await createClient();
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    const { data, error, count } = await supabase
      .from("users")
      .select("*", { count: "exact" })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to find users: ${error.message}`);

    return {
      data: data.map((d) => this.mapToEntity(d)),
      total: count || 0,
      page: params?.page || 1,
      limit,
      hasMore: (count || 0) > offset + limit,
    };
  }

  async findByRole(role: string): Promise<User[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", role);

    if (error) throw new Error(`Failed to find users by role: ${error.message}`);
    return data.map((d) => this.mapToEntity(d));
  }

  private mapToEntity(data: any): User {
    return new User(
      data.id,
      data.email,
      data.phone,
      data.role as UserRole,
      data.full_name,
      data.avatar_url,
      data.email_verified_at ? new Date(data.email_verified_at) : null,
      data.phone_verified_at ? new Date(data.phone_verified_at) : null,
      new Date(data.created_at),
      new Date(data.updated_at)
    );
  }

  private mapToDatabase(user: User): any {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      full_name: user.fullName,
      avatar_url: user.avatarUrl,
      email_verified_at: user.emailVerifiedAt?.toISOString() || null,
      phone_verified_at: user.phoneVerifiedAt?.toISOString() || null,
    };
  }
}

