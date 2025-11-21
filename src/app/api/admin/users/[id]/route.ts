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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await checkAdminAuth();

    const user = await userRepository.findById(params.id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get additional data based on role
    const supabase = await createClient();
    let additionalData: any = {};

    if (user.role === "bus_owner") {
      const { data: busOwner } = await supabase
        .from("bus_owners")
        .select("*")
        .eq("user_id", user.id)
        .single();
      additionalData.busOwner = busOwner;
    }

    if (user.role === "pos_agent") {
      const { data: terminal } = await supabase
        .from("pos_terminals")
        .select("*")
        .eq("assigned_user_id", user.id)
        .single();
      additionalData.terminal = terminal;
    }

    return NextResponse.json({ user, additionalData });
  } catch (error) {
    console.error("Error fetching user:", error);
    const message = (error as Error).message;
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json(
      { error: message || "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase } = await checkAdminAuth();
    const body = await request.json();
    const { fullName, phone, role, email } = body;

    const existingUser = await userRepository.findById(params.id);
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if trying to change role of last admin
    if (existingUser.role === "admin" && role !== "admin") {
      const { count } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");

      if ((count || 0) <= 1) {
        return NextResponse.json(
          { error: "Cannot change role of the last admin user" },
          { status: 400 }
        );
      }
    }

    // Validate role if provided
    if (role) {
      const validRoles: UserRole[] = ["passenger", "admin", "pos_agent", "bus_owner", "driver", "assistant", "financial", "display"];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Update user
    const updatedUser = new User(
      existingUser.id,
      email || existingUser.email,
      phone !== undefined ? phone : existingUser.phone,
      (role || existingUser.role) as UserRole,
      fullName !== undefined ? fullName : existingUser.fullName,
      existingUser.avatarUrl,
      existingUser.emailVerifiedAt,
      existingUser.phoneVerifiedAt,
      existingUser.createdAt,
      new Date()
    );

    const savedUser = await userRepository.update(updatedUser);

    // Update email in auth if changed (using admin client)
    if (email && email !== existingUser.email) {
      const adminClient = createAdminClient();
      await adminClient.auth.admin.updateUserById(existingUser.id, {
        email: email,
      });
    }

    return NextResponse.json({ user: savedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    const message = (error as Error).message;
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json(
      { error: message || "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase } = await checkAdminAuth();

    const user = await userRepository.findById(params.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent deleting last admin
    if (user.role === "admin") {
      const { count } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");

      if ((count || 0) <= 1) {
        return NextResponse.json(
          { error: "Cannot delete the last admin user" },
          { status: 400 }
        );
      }
    }

    // Delete from database first
    await userRepository.delete(params.id);

    // Then delete from auth (this will cascade delete related records)
    try {
      const adminClient = createAdminClient();
      await adminClient.auth.admin.deleteUser(params.id);
    } catch (authError) {
      console.error("Error deleting user from auth:", authError);
      // Continue even if auth deletion fails, as user is already deleted from DB
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    const message = (error as Error).message;
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json(
      { error: message || "Failed to delete user" },
      { status: 500 }
    );
  }
}

