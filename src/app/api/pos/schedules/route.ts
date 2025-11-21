import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ScheduleRepository } from "@/infrastructure/db/supabase/ScheduleRepository";
import { ScheduleAssignmentRepository } from "@/infrastructure/db/supabase/ScheduleAssignmentRepository";
import { RouteRepository } from "@/infrastructure/db/supabase/RouteRepository";
import { TripRepository } from "@/infrastructure/db/supabase/TripRepository";
import { format } from "date-fns";

export const dynamic = 'force-dynamic';

const scheduleRepository = new ScheduleRepository();
const assignmentRepository = new ScheduleAssignmentRepository();
const routeRepository = new RouteRepository();
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

    // Check if user is POS agent or admin
    const userData = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!["admin", "pos_agent"].includes(userData.data?.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get date from query params or use today
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get("date");
    let targetDate: Date;
    
    if (dateParam) {
      targetDate = new Date(dateParam);
      if (isNaN(targetDate.getTime())) {
        targetDate = new Date();
      }
    } else {
      targetDate = new Date();
    }
    
    // Set to start of day
    targetDate.setHours(0, 0, 0, 0);
    const dateStr = format(targetDate, "yyyy-MM-dd");

    // Fetch all active schedules with route info
    const { data: schedulesData, error: schedulesError } = await supabase
      .from("schedules")
      .select(`
        id,
        route_id,
        hour,
        is_express,
        express_price_multiplier,
        is_active,
        routes (
          id,
          name,
          origin,
          destination,
          base_price,
          is_express
        )
      `)
      .eq("is_active", true)
      .order("hour", { ascending: true });

    if (schedulesError) {
      throw new Error(`Failed to fetch schedules: ${schedulesError.message}`);
    }

    // Fetch today's assignments for all schedules
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from("schedule_assignments")
      .select(`
        id,
        schedule_id,
        bus_id,
        date,
        bus:buses (
          id,
          plate_number,
          unit_number,
          capacity
        )
      `)
      .eq("date", dateStr);

    if (assignmentsError) {
      throw new Error(`Failed to fetch assignments: ${assignmentsError.message}`);
    }

    // Fetch trips for the target date
    // Use UTC dates to avoid timezone issues
    const startOfDay = new Date(dateStr + "T00:00:00Z");
    const endOfDay = new Date(dateStr + "T23:59:59.999Z");
    
    console.log(`[POS Schedules] Fetching trips for date ${dateStr}: from ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

    const { data: tripsData, error: tripsError } = await supabase
      .from("trips")
      .select(`
        id,
        route_id,
        bus_id,
        departure_time,
        available_seats,
        total_seats,
        status
      `)
      .gte("departure_time", startOfDay.toISOString())
      .lte("departure_time", endOfDay.toISOString())
      .in("status", ["scheduled", "boarding"]);

    console.log(`[POS Schedules] Found ${tripsData?.length || 0} trips for date ${dateStr}`);

    if (tripsError) {
      throw new Error(`Failed to fetch trips: ${tripsError.message}`);
    }

    // Group assignments by schedule_id
    const assignmentsBySchedule = new Map<string, any[]>();
    (assignmentsData || []).forEach((assignment: any) => {
      if (!assignmentsBySchedule.has(assignment.schedule_id)) {
        assignmentsBySchedule.set(assignment.schedule_id, []);
      }
      assignmentsBySchedule.get(assignment.schedule_id)!.push(assignment);
    });

    // Group trips by schedule: match trips to schedules by route_id and hour
    const tripsBySchedule = new Map<string, any[]>();
    (tripsData || []).forEach((trip: any) => {
      try {
        // Match trip to schedule by route_id and hour extracted from departure_time
        const departureDate = new Date(trip.departure_time);
        
        // Use UTC consistently to match how trips are created
        const tripHour = departureDate.getUTCHours();
        const tripRouteId = trip.route_id;
        
        // Extract date in UTC format (yyyy-MM-dd)
        const tripYear = departureDate.getUTCFullYear();
        const tripMonth = String(departureDate.getUTCMonth() + 1).padStart(2, "0");
        const tripDay = String(departureDate.getUTCDate()).padStart(2, "0");
        const tripDateStr = `${tripYear}-${tripMonth}-${tripDay}`;

        // Debug log
        console.log(`[POS Schedules] Trip ${trip.id}: route_id=${tripRouteId}, hour=${tripHour}, date=${tripDateStr}, status=${trip.status}, targetDate=${dateStr}`);

        // Find matching schedule - must match route_id, hour, AND date
        const matchingSchedule = (schedulesData || []).find((s: any) => {
          const matchesRoute = s.route_id === tripRouteId;
          const matchesHour = s.hour === tripHour;
          const matchesDate = tripDateStr === dateStr;
          
          if (matchesRoute && matchesHour && matchesDate) {
            console.log(`[POS Schedules] Found matching schedule ${s.id} for trip ${trip.id}`);
          }
          
          return matchesRoute && matchesHour && matchesDate;
        });

        if (matchingSchedule) {
          const scheduleId = matchingSchedule.id;
          if (!tripsBySchedule.has(scheduleId)) {
            tripsBySchedule.set(scheduleId, []);
          }
          tripsBySchedule.get(scheduleId)!.push(trip);
        } else {
          console.log(`[POS Schedules] No matching schedule found for trip ${trip.id} (route=${tripRouteId}, hour=${tripHour}, date=${tripDateStr})`);
        }
      } catch (error) {
        console.error(`[POS Schedules] Error processing trip ${trip.id}:`, error);
      }
    });

    // Fetch route stops for all routes
    const routeIds = [...new Set((schedulesData || []).map((s: any) => s.route_id))];
    const { data: routeStopsData, error: routeStopsError } = await supabase
      .from("route_stops")
      .select(`
        id,
        route_id,
        name,
        price,
        order_index
      `)
      .in("route_id", routeIds)
      .order("order_index", { ascending: true });

    if (routeStopsError) {
      console.error("Error fetching route stops:", routeStopsError);
      // Continue without stops if there's an error
    }

    // Group stops by route_id
    const stopsByRoute = new Map<string, any[]>();
    (routeStopsData || []).forEach((stop: any) => {
      if (!stopsByRoute.has(stop.route_id)) {
        stopsByRoute.set(stop.route_id, []);
      }
      stopsByRoute.get(stop.route_id)!.push(stop);
    });

    // Filter schedules to only show those with assigned buses
    // Enrich schedules with assignments and trip info
    console.log(`[POS Schedules] Processing ${schedulesData?.length || 0} schedules for date ${dateStr}`);
    console.log(`[POS Schedules] Found ${assignmentsData?.length || 0} assignments`);
    console.log(`[POS Schedules] Found ${tripsData?.length || 0} trips`);
    console.log(`[POS Schedules] Trips by schedule map size: ${tripsBySchedule.size}`);

    const enrichedSchedules = (schedulesData || [])
      .map((schedule: any) => {
      const route = schedule.route;
      const assignments = assignmentsBySchedule.get(schedule.id) || [];
      const trips = tripsBySchedule.get(schedule.id) || [];

      console.log(`[POS Schedules] Schedule ${schedule.id}: route_id=${schedule.route_id}, hour=${schedule.hour}, assignments=${assignments.length}, trips=${trips.length}`);

      // Calculate total available seats from trips
      const totalAvailableSeats = trips.reduce((sum: number, trip: any) => sum + (trip.available_seats || 0), 0);
      const totalSeats = trips.reduce((sum: number, trip: any) => sum + (trip.total_seats || 0), 0);

      // Get route stops for this route
      const routeStops = stopsByRoute.get(schedule.route_id) || [];
      
      // Calculate price multiplier
      const priceMultiplier = schedule.is_express 
        ? parseFloat(schedule.express_price_multiplier || "1.0")
        : 1.0;

      // Calculate prices from stops
      let minPrice: number | undefined;
      let maxPrice: number | undefined;
      let basePrice = parseFloat(route?.base_price || "0");
      
      if (routeStops.length > 0) {
        // Use stop prices if available
        const stopPrices = routeStops.map((stop: any) => parseFloat(stop.price || "0") * priceMultiplier);
        minPrice = Math.min(...stopPrices);
        maxPrice = Math.max(...stopPrices);
      } else {
        // Fallback to base price
        minPrice = basePrice * priceMultiplier;
        maxPrice = basePrice * priceMultiplier;
      }

      // Legacy price for backward compatibility
      const price = basePrice * priceMultiplier;

      // Show schedule if it has assigned buses, even if no trips exist yet
      const hasAssignedBuses = assignments.length > 0;
      
      return {
        id: schedule.id,
        hour: schedule.hour,
        hourFormatted: `${schedule.hour.toString().padStart(2, "0")}:00`,
        routeId: schedule.route_id,
        routeName: route?.name || `${route?.origin} → ${route?.destination}`,
        origin: route?.origin || "",
        destination: route?.destination || "",
        isExpress: schedule.is_express || false,
        price: price, // Legacy field
        basePrice: basePrice,
        minPrice: minPrice,
        maxPrice: maxPrice,
        stops: routeStops.map((stop: any) => ({
          id: stop.id,
          name: stop.name,
          price: parseFloat(stop.price || "0") * priceMultiplier,
          orderIndex: stop.order_index,
        })),
        assignedBuses: assignments.map((a: any) => ({
          id: a.bus_id,
          plateNumber: a.bus?.plate_number || "N/A",
          unitNumber: a.bus?.unit_number || null,
          capacity: a.bus?.capacity || 0,
        })),
        availableSeats: totalAvailableSeats || (hasAssignedBuses ? assignments.reduce((sum: number, a: any) => sum + (a.bus?.capacity || 0), 0) : 0),
        totalSeats: totalSeats || (hasAssignedBuses ? assignments.reduce((sum: number, a: any) => sum + (a.bus?.capacity || 0), 0) : 0),
        hasTrips: trips.length > 0,
        tripIds: trips.map((t: any) => t.id),
        hasAssignedBuses: hasAssignedBuses,
        date: dateStr, // Include date in response
      };
    })
    .filter((schedule: any) => schedule.hasAssignedBuses); // Only show schedules with assigned buses

    console.log(`[POS Schedules] Returning ${enrichedSchedules.length} enriched schedules for date ${dateStr}`);

    return NextResponse.json({ schedules: enrichedSchedules });
  } catch (error) {
    console.error("Error fetching POS schedules:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch schedules" },
      { status: 500 }
    );
  }
}

