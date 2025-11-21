import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserRepository } from "@/infrastructure/db/supabase/UserRepository";
import { User } from "@/domain/entities";
import { UserRole } from "@/domain/types";

export const dynamic = 'force-dynamic';

const userRepository = new UserRepository();

async function checkAdminAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin") {
    throw new Error("Forbidden");
  }

  return { supabase, user };
}

export async function GET(request: NextRequest) {
  try {
    await checkAdminAuth();

    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get("role");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    const supabase = await createClient();
    let query = supabase.from("users").select("*", { count: "exact" });

    // Filter by role
    if (role && role !== "all") {
      query = query.eq("role", role);
    }

    // Search by name, email, or phone
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // Pagination
    query = query.range(offset, offset + limit - 1).order("created_at", { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    // Get role counts for statistics
    const { data: allUsers } = await supabase.from("users").select("role");
    const roleCounts: Record<string, number> = {};
    (allUsers || []).forEach((u: any) => {
      roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
    });

    return NextResponse.json({
      users: data || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        hasMore: (count || 0) > offset + limit,
      },
      statistics: {
        total: count || 0,
        byRole: roleCounts || {},
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    const message = (error as Error).message;
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json(
      { error: message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await checkAdminAuth();
    const body = await request.json();
    const { email, password, fullName, phone, role } = body;

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: "email, password, and role are required" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles: UserRole[] = ["passenger", "admin", "pos_agent", "bus_owner", "driver", "assistant", "financial", "display"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Create user in Supabase Auth using admin client (service role key)
    const adminClient = createAdminClient();
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone,
        role: role,
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Failed to create user in auth" },
        { status: 400 }
      );
    }

    // Create user record in users table using admin client (bypasses RLS)
    const { data: userData, error: userError } = await adminClient
      .from("users")
      .insert({
        id: authData.user.id,
        email,
        phone: phone || null,
        role: role as UserRole,
        full_name: fullName || null,
        email_verified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (userError) {
      // Rollback: delete auth user if user creation fails
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: `Failed to create user record: ${userError.message}` },
        { status: 400 }
      );
    }

    // Map to User entity
    const savedUser = new User(
      userData.id,
      userData.email,
      userData.phone,
      userData.role as UserRole,
      userData.full_name,
      userData.avatar_url,
      userData.email_verified_at ? new Date(userData.email_verified_at) : null,
      userData.phone_verified_at ? new Date(userData.phone_verified_at) : null,
      new Date(userData.created_at),
      new Date(userData.updated_at)
    );

    return NextResponse.json({ user: savedUser }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    const message = (error as Error).message;
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json(
      { error: message || "Failed to create user" },
      { status: 500 }
    );
  }
}

