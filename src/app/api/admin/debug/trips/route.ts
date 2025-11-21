import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

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

    // Get all trips
    const { data: trips, error: tripsError } = await supabase
      .from("trips")
      .select(`
        id,
        route_id,
        bus_id,
        departure_time,
        arrival_estimate,
        status,
        available_seats,
        total_seats,
        price,
        created_at,
        updated_at,
        routes(id, name, origin, destination),
        buses(id, plate_number, unit_number)
      `)
      .order("departure_time", { ascending: false })
      .limit(100);

    if (tripsError) {
      return NextResponse.json(
        { error: `Failed to fetch trips: ${tripsError.message}` },
        { status: 500 }
      );
    }

    // Get all schedules
    const { data: schedules, error: schedulesError } = await supabase
      .from("schedules")
      .select("id, route_id, hour, is_express, is_active")
      .eq("is_active", true);

    if (schedulesError) {
      console.error("Error fetching schedules:", schedulesError);
    }

    // Get all schedule assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from("schedule_assignments")
      .select("id, schedule_id, bus_id, date")
      .order("date", { ascending: false })
      .limit(100);

    if (assignmentsError) {
      console.error("Error fetching assignments:", assignmentsError);
    }

    // Analyze trips
    const now = new Date();
    const analysis = {
      totalTrips: trips?.length || 0,
      tripsByStatus: {} as Record<string, number>,
      tripsByDate: {} as Record<string, number>,
      tripsWithoutRoute: [] as any[],
      tripsWithoutBus: [] as any[],
      tripsWithInvalidDate: [] as any[],
      tripsThatShouldAppear: [] as any[],
      tripsThatWontAppear: [] as any[],
    };

    (trips || []).forEach((trip: any) => {
      // Count by status
      const status = trip.status || "unknown";
      analysis.tripsByStatus[status] = (analysis.tripsByStatus[status] || 0) + 1;

      // Count by date
      if (trip.departure_time) {
        const tripDate = new Date(trip.departure_time);
        const dateStr = format(tripDate, "yyyy-MM-dd");
        analysis.tripsByDate[dateStr] = (analysis.tripsByDate[dateStr] || 0) + 1;
      }

      // Check for missing route
      if (!trip.route_id || !trip.routes) {
        analysis.tripsWithoutRoute.push({
          id: trip.id,
          route_id: trip.route_id,
          departure_time: trip.departure_time,
        });
      }

      // Check for missing bus
      if (!trip.bus_id || !trip.buses) {
        analysis.tripsWithoutBus.push({
          id: trip.id,
          bus_id: trip.bus_id,
          departure_time: trip.departure_time,
        });
      }

      // Check for invalid date
      if (!trip.departure_time || isNaN(new Date(trip.departure_time).getTime())) {
        analysis.tripsWithInvalidDate.push({
          id: trip.id,
          departure_time: trip.departure_time,
        });
      }

      // Check if trip should appear
      if (trip.status === "scheduled" || trip.status === "boarding") {
        const tripDate = new Date(trip.departure_time);
        // Use UTC to match how trips are created
        const tripHour = tripDate.getUTCHours();
        const tripYear = tripDate.getUTCFullYear();
        const tripMonth = String(tripDate.getUTCMonth() + 1).padStart(2, "0");
        const tripDay = String(tripDate.getUTCDate()).padStart(2, "0");
        const tripDateStr = `${tripYear}-${tripMonth}-${tripDay}`;
        
        // Find matching schedule
        const matchingSchedule = (schedules || []).find(
          (s: any) => s.route_id === trip.route_id && s.hour === tripHour
        );

        // Find matching assignment - compare dates properly
        const matchingAssignment = (assignments || []).find(
          (a: any) => {
            // Assignment date is stored as a date string (YYYY-MM-DD)
            const assignmentDateStr = typeof a.date === 'string' 
              ? a.date.split('T')[0] // Extract date part if it's a datetime string
              : format(new Date(a.date), "yyyy-MM-dd");
            return a.schedule_id === matchingSchedule?.id && 
                   assignmentDateStr === tripDateStr;
          }
        );

        const shouldAppear = !!matchingSchedule && !!matchingAssignment;

        if (shouldAppear) {
          analysis.tripsThatShouldAppear.push({
            trip: {
              id: trip.id,
              route_id: trip.route_id,
              departure_time: trip.departure_time,
              status: trip.status,
              available_seats: trip.available_seats,
              total_seats: trip.total_seats,
            },
            schedule: matchingSchedule,
            assignment: matchingAssignment,
            route: trip.routes,
            bus: trip.buses,
          });
        } else {
          analysis.tripsThatWontAppear.push({
            trip: {
              id: trip.id,
              route_id: trip.route_id,
              departure_time: trip.departure_time,
              status: trip.status,
            },
            reason: !matchingSchedule 
              ? "No matching schedule found" 
              : !matchingAssignment 
              ? "No matching assignment found"
              : "Unknown",
            schedule: matchingSchedule || null,
            assignment: matchingAssignment || null,
          });
        }
      }
    });

    return NextResponse.json({
      summary: {
        totalTrips: analysis.totalTrips,
        tripsByStatus: analysis.tripsByStatus,
        tripsByDate: analysis.tripsByDate,
        issues: {
          tripsWithoutRoute: analysis.tripsWithoutRoute.length,
          tripsWithoutBus: analysis.tripsWithoutBus.length,
          tripsWithInvalidDate: analysis.tripsWithInvalidDate.length,
        },
        tripsThatShouldAppear: analysis.tripsThatShouldAppear.length,
        tripsThatWontAppear: analysis.tripsThatWontAppear.length,
      },
      trips: trips?.map((trip: any) => ({
        id: trip.id,
        route_id: trip.route_id,
        bus_id: trip.bus_id,
        departure_time: trip.departure_time,
        status: trip.status,
        available_seats: trip.available_seats,
        total_seats: trip.total_seats,
        price: trip.price,
        route: trip.routes,
        bus: trip.buses,
      })),
      analysis: {
        tripsWithoutRoute: analysis.tripsWithoutRoute,
        tripsWithoutBus: analysis.tripsWithoutBus,
        tripsWithInvalidDate: analysis.tripsWithInvalidDate,
        tripsThatShouldAppear: analysis.tripsThatShouldAppear,
        tripsThatWontAppear: analysis.tripsThatWontAppear,
      },
      schedules: schedules || [],
      assignments: assignments || [],
    });
  } catch (error) {
    console.error("Error in debug trips:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to debug trips" },
      { status: 500 }
    );
  }
}

