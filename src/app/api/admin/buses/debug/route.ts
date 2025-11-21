import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to check buses in database
 * This bypasses RLS to see what actually exists
 */
export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient();

    // Get all buses without RLS restrictions
    const { data: allBuses, error: busesError } = await adminClient
      .from("buses")
      .select("id, plate_number, owner_id, is_active, created_at, unit_number")
      .order("created_at", { ascending: false });

    if (busesError) {
      return NextResponse.json(
        { error: `Error fetching buses: ${busesError.message}` },
        { status: 500 }
      );
    }

    // Get bus owners info
    const { data: busOwners, error: ownersError } = await adminClient
      .from("bus_owners")
      .select("id, company_name, user_id");

    if (ownersError) {
      console.error("Error fetching bus owners:", ownersError);
    }

    // Enrich buses with owner info
    const enrichedBuses = (allBuses || []).map((bus) => {
      const owner = busOwners?.find((bo) => bo.id === bus.owner_id);
      return {
        ...bus,
        owner: owner
          ? {
              id: owner.id,
              company_name: owner.company_name,
              user_id: owner.user_id,
            }
          : null,
      };
    });

    // Get current user info if authenticated
    let userRole = null;
    try {
      const { data: { user } } = await adminClient.auth.getUser();
      if (user) {
        const { data: userData } = await adminClient
          .from("users")
          .select("id, email, role, full_name")
          .eq("id", user.id)
          .single();
        userRole = userData;
      }
    } catch (error) {
      // Not authenticated, that's ok for debug
    }

    return NextResponse.json({
      totalBuses: enrichedBuses.length,
      activeBuses: enrichedBuses.filter((b) => b.is_active).length,
      inactiveBuses: enrichedBuses.filter((b) => !b.is_active).length,
      buses: enrichedBuses,
      currentUser: userRole,
      note: "This endpoint bypasses RLS to show all buses in the database",
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch debug info" },
      { status: 500 }
    );
  }
}

