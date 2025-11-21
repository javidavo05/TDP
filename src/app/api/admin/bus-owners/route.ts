import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData.data?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient();

    // First, find all users with bus_owner role
    const { data: busOwnerUsers, error: usersError } = await adminClient
      .from("users")
      .select("id, full_name, email, phone")
      .eq("role", "bus_owner");

    if (usersError) {
      throw new Error(`Failed to fetch bus owner users: ${usersError.message}`);
    }

    // Fetch existing bus_owners records
    const { data: busOwnersData, error: busOwnersError } = await adminClient
      .from("bus_owners")
      .select("id, company_name, user_id, phone, email")
      .order("company_name", { ascending: true });

    if (busOwnersError) {
      throw new Error(`Failed to fetch bus owners: ${busOwnersError.message}`);
    }

    // Create a map of existing bus_owners by user_id
    const existingOwnersMap = new Map(
      (busOwnersData || []).map((owner) => [owner.user_id, owner])
    );

    // Process all bus_owner users and create missing records
    const busOwnersWithUsers = await Promise.all(
      (busOwnerUsers || []).map(async (user) => {
        let owner = existingOwnersMap.get(user.id);

        // If user doesn't have a bus_owners record, create one
        if (!owner) {
          const companyName = user.full_name 
            ? `${user.full_name} - Empresa`
            : user.email?.split("@")[0] || "Empresa";

          const { data: newOwner, error: createError } = await adminClient
            .from("bus_owners")
            .insert({
              user_id: user.id,
              company_name: companyName,
              email: user.email || null,
            })
            .select("id, company_name, user_id")
            .single();

          if (createError) {
            console.error(`Failed to create bus_owner for user ${user.id}:`, createError);
            // Continue with a placeholder if creation fails
            owner = {
              id: user.id, // Use user id as fallback
              company_name: companyName,
              user_id: user.id,
            };
          } else {
            owner = newOwner;
          }
        }

        return {
          id: owner.id,
          company_name: owner.company_name,
          user_id: owner.user_id,
          phone: owner.phone || null,
          email: owner.email || null,
          user: user || null,
        };
      })
    );

    // Sort by company name
    busOwnersWithUsers.sort((a, b) => 
      a.company_name.localeCompare(b.company_name)
    );

    return NextResponse.json({ busOwners: busOwnersWithUsers });
  } catch (error) {
    console.error("Error fetching bus owners:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch bus owners" },
      { status: 500 }
    );
  }
}

