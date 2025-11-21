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

    // Admin sees all trips - support filtering by date and routeId
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const routeId = searchParams.get("routeId");

    if (date) {
      // Get trips for specific date
      const targetDate = new Date(date);
      const startDate = new Date(targetDate);
      startDate.setUTCHours(0, 0, 0, 0);
      const endDate = new Date(targetDate);
      endDate.setUTCHours(23, 59, 59, 999);

      const supabaseClient = await createClient();
      let query = supabaseClient
        .from("trips")
        .select("*")
        .gte("departure_time", startDate.toISOString())
        .lte("departure_time", endDate.toISOString());

      if (routeId) {
        query = query.eq("route_id", routeId);
      }

      const { data: tripsData, error: tripsError } = await query.order("departure_time", { ascending: true });

      if (tripsError) {
        throw new Error(`Failed to fetch trips: ${tripsError.message}`);
      }

      // Map trips to entity format
      const trips = (tripsData || []).map((t: any) => ({
        id: t.id,
        busId: t.bus_id,
        routeId: t.route_id,
        departureTime: new Date(t.departure_time).toISOString(),
        arrivalEstimate: t.arrival_estimate ? new Date(t.arrival_estimate).toISOString() : null,
        status: t.status,
        currentStopId: t.current_stop_id,
        availableSeats: t.available_seats,
        totalSeats: t.total_seats,
        price: parseFloat(t.price),
        createdAt: new Date(t.created_at).toISOString(),
        updatedAt: new Date(t.updated_at).toISOString(),
      }));
      return NextResponse.json({ trips, total: trips.length });
    }

    // If no date filter, return empty for now (can be extended to return all trips)
    return NextResponse.json({ trips: [], total: 0 });
  } catch (error) {
    console.error("Error fetching trips:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch trips" },
      { status: 500 }
    );
  }
}

