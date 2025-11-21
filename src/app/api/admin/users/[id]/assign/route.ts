import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    throw new Error("Forbidden");
  }

  return { supabase, user };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase } = await checkAdminAuth();
    const body = await request.json();
    const { resourceType, resourceId, additionalData } = body;

    // Get user to check role
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", params.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const role = userData.role;

    // Assign resources based on role
    switch (role) {
      case "pos_agent":
        if (resourceType === "terminal" && resourceId) {
          // Check if terminal is already assigned
          const { data: existingAssignment } = await supabase
            .from("pos_terminals")
            .select("assigned_user_id")
            .eq("id", resourceId)
            .single();

          if (existingAssignment?.assigned_user_id && existingAssignment.assigned_user_id !== params.id) {
            return NextResponse.json(
              { error: "Terminal is already assigned to another user" },
              { status: 400 }
            );
          }

          // Assign terminal
          const { error: terminalError } = await supabase
            .from("pos_terminals")
            .update({ assigned_user_id: params.id })
            .eq("id", resourceId);

          if (terminalError) {
            throw new Error(`Failed to assign terminal: ${terminalError.message}`);
          }

          return NextResponse.json({ success: true, message: "Terminal assigned successfully" });
        }
        break;

      case "bus_owner":
        if (resourceType === "bus_owner_data") {
          // Create or update bus_owner record
          const { data: existingOwner } = await supabase
            .from("bus_owners")
            .select("id")
            .eq("user_id", params.id)
            .single();

          const ownerData = {
            user_id: params.id,
            company_name: additionalData?.companyName || "",
            tax_id: additionalData?.taxId || null,
            address: additionalData?.address || null,
            phone: additionalData?.phone || null,
            email: additionalData?.email || null,
            accounting_email: additionalData?.accountingEmail || null,
          };

          if (existingOwner) {
            // Update existing
            const { error: updateError } = await supabase
              .from("bus_owners")
              .update(ownerData)
              .eq("id", existingOwner.id);

            if (updateError) {
              throw new Error(`Failed to update bus owner: ${updateError.message}`);
            }
          } else {
            // Create new
            const { error: createError } = await supabase
              .from("bus_owners")
              .insert(ownerData);

            if (createError) {
              throw new Error(`Failed to create bus owner: ${createError.message}`);
            }
          }

          return NextResponse.json({ success: true, message: "Bus owner data saved successfully" });
        }
        break;

      case "driver":
      case "assistant":
        // For now, drivers and assistants don't have specific assignments
        // This can be extended later if needed
        return NextResponse.json({ success: true, message: "Role assignment completed" });

      default:
        return NextResponse.json(
          { error: `Resource assignment not supported for role: ${role}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error assigning resource:", error);
    const message = (error as Error).message;
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json(
      { error: message || "Failed to assign resource" },
      { status: 500 }
    );
  }
}

