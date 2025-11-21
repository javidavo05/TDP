import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated (optional - can be public)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // If user is authenticated, check role
    if (user) {
      const userData = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      // Allow access for display role, admin, or public (no auth)
      const role = userData.data?.role;
      if (role && !["admin", "display"].includes(role)) {
        // For other roles, still allow but could restrict if needed
      }
    }

    const now = new Date();
    const tenHoursLater = new Date(now.getTime() + 10 * 60 * 60 * 1000);

    // Get trips for the next 10 hours
    const { data: tripsData, error: tripsError } = await supabase
      .from("trips")
      .select(`
        id,
        departure_time,
        status,
        available_seats,
        total_seats,
        price,
        routes (
          id,
          origin,
          destination,
          name
        ),
        buses (
          id,
          plate_number,
          unit_number,
          bus_class
        )
      `)
      .gte("departure_time", now.toISOString())
      .lte("departure_time", tenHoursLater.toISOString())
      .in("status", ["scheduled", "boarding"])
      .order("departure_time", { ascending: true });

    if (tripsError) {
      throw new Error(`Failed to fetch trips: ${tripsError.message}`);
    }

    // Transform trips to departures format
    const departures = (tripsData || [])
      .filter((trip: any) => trip.routes && trip.buses)
      .map((trip: any) => {
        const departureTime = new Date(trip.departure_time);
        const minutesUntil = (departureTime.getTime() - now.getTime()) / (1000 * 60);

        let status: "scheduled" | "boarding" | "departed" | "delayed" = trip.status as "scheduled" | "boarding";
        if (minutesUntil < -30) {
          status = "departed";
        } else if (minutesUntil >= 0 && minutesUntil <= 30 && trip.status === "scheduled") {
          status = "boarding";
        }

        return {
          id: trip.id,
          hour: departureTime.getHours(),
          minute: departureTime.getMinutes(),
          departureTime: trip.departure_time,
          isExpress: false, // Can be added to trips table if needed
          busPlateNumber: trip.buses.plate_number,
          busUnitNumber: trip.buses.unit_number,
          busClass: trip.buses.bus_class || "economico",
          routeOrigin: trip.routes?.origin || "N/A",
          routeDestination: trip.routes?.destination || "N/A",
          routeName: trip.routes?.name || "",
          status,
          availableSeats: trip.available_seats,
          totalSeats: trip.total_seats,
          price: trip.price,
        };
      })
      .sort((a: any, b: any) => {
        // Sort by departure time
        return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
      });

    return NextResponse.json({ departures });
  } catch (error) {
    console.error("Error fetching departures:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch departures" },
      { status: 500 }
    );
  }
}

