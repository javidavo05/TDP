import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TripRepository } from "@/infrastructure/db/supabase/TripRepository";
import { BusOdometerService } from "@/services/admin/BusOdometerService";
import { BusRepository } from "@/infrastructure/db/supabase/BusRepository";
import { RouteRepository } from "@/infrastructure/db/supabase/RouteRepository";
import { DriverHoursService } from "@/services/admin/DriverHoursService";
import { DriverHoursRepository } from "@/infrastructure/db/supabase/DriverHoursRepository";
import { DriverHoursConfigRepository } from "@/infrastructure/db/supabase/DriverHoursConfigRepository";

export const dynamic = 'force-dynamic';

const tripRepository = new TripRepository();
const busRepository = new BusRepository();
const routeRepository = new RouteRepository();
const odometerService = new BusOdometerService(busRepository, tripRepository, routeRepository);
const hoursRepository = new DriverHoursRepository();
const configRepository = new DriverHoursConfigRepository();
const hoursService = new DriverHoursService(hoursRepository, configRepository);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    if (!["admin", "driver"].includes(userData.data?.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const trip = await tripRepository.findById(params.id);
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Update trip status to completed
    trip.status = "completed";
    const updatedTrip = await tripRepository.update(trip);

    // Update bus odometer
    try {
      await odometerService.updateBusOdometerOnTripCompletion(trip.busId, trip.id);
    } catch (error) {
      console.error("Error updating bus odometer:", error);
      // Don't fail the request if odometer update fails
    }

    // End driver hours tracking if driver is assigned
    try {
      // Find schedule assignment by trip's route and date
      const tripDate = new Date(trip.departureTime);
      tripDate.setHours(0, 0, 0, 0);
      const dateStr = tripDate.toISOString().split("T")[0];
      
      // Get schedule for this route and hour
      const tripHour = trip.departureTime.getHours();
      const { data: schedules } = await supabase
        .from("schedules")
        .select("id")
        .eq("route_id", trip.routeId)
        .eq("hour", tripHour)
        .limit(1);

      if (schedules && schedules.length > 0) {
        const { data: assignment } = await supabase
          .from("schedule_assignments")
          .select("driver_id")
          .eq("schedule_id", schedules[0].id)
          .eq("date", dateStr)
          .eq("bus_id", trip.busId)
          .single();

        if (assignment?.driver_id) {
          const driverHours = await hoursRepository.findByTrip(trip.id);
          if (driverHours) {
            await hoursService.endTrip(trip.id, new Date());
          }
        }
      }
    } catch (error) {
      console.error("Error ending driver hours:", error);
      // Don't fail the request if hours update fails
    }

    return NextResponse.json({ trip: updatedTrip });
  } catch (error) {
    console.error("Error completing trip:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to complete trip" },
      { status: 500 }
    );
  }
}

