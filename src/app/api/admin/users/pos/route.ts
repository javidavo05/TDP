import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = 'force-dynamic';

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
    throw new Error("Forbidden: Admin access required");
  }

  return { user, role: userData?.role };
}

export async function GET(request: NextRequest) {
  try {
    await checkAdminAuth();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "pos_agent")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ users: data || [] });
  } catch (error) {
    console.error("Error fetching POS users:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch POS users" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await checkAdminAuth();
    const supabase = await createClient();
    const body = await request.json();
    const { email, password, fullName, terminalId } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "email, password, and fullName are required" },
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
        role: "pos_agent",
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Failed to create user" },
        { status: 400 }
      );
    }

    // Create user record in users table using admin client (bypasses RLS)
    const { data: userData, error: userError } = await adminClient
      .from("users")
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role: "pos_agent",
        email_verified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (userError) {
      // Rollback: delete auth user if user creation fails
      const adminClient = createAdminClient();
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: userError.message || "Failed to create user record" },
        { status: 400 }
      );
    }

    // If terminalId is provided, assign user to terminal (using admin client)
    if (terminalId && userData) {
      await adminClient
        .from("pos_terminals")
        .update({ assigned_user_id: userData.id })
        .eq("id", terminalId);
    }

    return NextResponse.json({ user: userData }, { status: 201 });
  } catch (error) {
    console.error("Error creating POS user:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to create POS user" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

