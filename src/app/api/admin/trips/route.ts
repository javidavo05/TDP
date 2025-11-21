import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TripRepository } from "@/infrastructure/db/supabase/TripRepository";

export const dynamic = 'force-dynamic';

const tripRepository = new TripRepository();

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

    if (!["admin", "bus_owner"].includes(userData.data?.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If bus_owner, filter by their buses
    if (userData.data?.role === "bus_owner") {
      const { data: busOwner } = await supabase
        .from("bus_owners")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (busOwner) {
        const result = await tripRepository.findByOwner(busOwner.id);
        return NextResponse.json({ trips: result.data, total: result.total });
      }
    }

    // Admin sees all trips - for now return empty, can be extended
    return NextResponse.json({ trips: [], total: 0 });
  } catch (error) {
    console.error("Error fetching trips:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch trips" },
      { status: 500 }
    );
  }
}

