import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ScheduleAssignmentService } from "@/services/admin/ScheduleAssignmentService";
import { ScheduleAssignmentRepository } from "@/infrastructure/db/supabase/ScheduleAssignmentRepository";
import { ScheduleService } from "@/services/admin/ScheduleService";
import { ScheduleRepository } from "@/infrastructure/db/supabase/ScheduleRepository";
import { TripRepository } from "@/infrastructure/db/supabase/TripRepository";
import { RouteRepository } from "@/infrastructure/db/supabase/RouteRepository";
import { BusRepository } from "@/infrastructure/db/supabase/BusRepository";
import { BusOdometerService } from "@/services/admin/BusOdometerService";
import { Trip } from "@/domain/entities";

export const dynamic = 'force-dynamic';

const assignmentRepository = new ScheduleAssignmentRepository();
const assignmentService = new ScheduleAssignmentService(assignmentRepository);
const scheduleRepository = new ScheduleRepository();
const scheduleService = new ScheduleService(scheduleRepository);
const tripRepository = new TripRepository();
const routeRepository = new RouteRepository();
const busRepository = new BusRepository();
const odometerService = new BusOdometerService(busRepository, tripRepository, routeRepository);

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { date } = body;

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const targetDate = new Date(date);
    const startDate = new Date(targetDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    // Get all assignments for the date
    const assignments = await assignmentService.getAssignmentsByDateRange(startDate, endDate);

    const createdTrips: Trip[] = [];
    const skippedTrips: Array<{ scheduleId: string; reason: string }> = [];

    for (const assignment of assignments) {
      // Validate that assignment has a bus assigned
      if (!assignment.busId) {
        skippedTrips.push({
          scheduleId: assignment.scheduleId,
          reason: "No bus assigned to schedule",
        });
        continue;
      }

      // Get schedule details
      const schedule = await scheduleService.getScheduleById(assignment.scheduleId);
      if (!schedule || !schedule.isActive) {
        skippedTrips.push({
          scheduleId: assignment.scheduleId,
          reason: "Schedule not found or inactive",
        });
        continue;
      }

      // Get route details
      const route = await routeRepository.findById(schedule.routeId);
      if (!route || !route.isActive) {
        skippedTrips.push({
          scheduleId: assignment.scheduleId,
          reason: "Route not found or inactive",
        });
        continue;
      }

      // Get bus details
      const bus = await busRepository.findById(assignment.busId);
      if (!bus || !bus.isActive) {
        skippedTrips.push({
          scheduleId: assignment.scheduleId,
          reason: "Bus not found or inactive",
        });
        continue;
      }

      // Calculate departure time using the assignment's date, not targetDate
      // This ensures trips are created for the correct date
      const assignmentDate = new Date(assignment.date);
      assignmentDate.setUTCHours(0, 0, 0, 0); // Start of day in UTC
      
      const departureTime = new Date(assignmentDate);
      departureTime.setUTCHours(schedule.hour, 0, 0, 0);
      departureTime.setUTCSeconds(0, 0);
      
      console.log(`[Generate Trips] Assignment date: ${assignment.date}, Schedule hour: ${schedule.hour}, Departure time: ${departureTime.toISOString()}`);

      // Calculate price (consider express multiplier)
      let price = route.basePrice;
      if (schedule.isExpress) {
        price = route.basePrice * schedule.expressPriceMultiplier;
      }

      // Calculate arrival estimate
      const arrivalEstimate = new Date(departureTime);
      if (route.estimatedDurationMinutes) {
        arrivalEstimate.setUTCMinutes(arrivalEstimate.getUTCMinutes() + route.estimatedDurationMinutes);
      }

      // Create trip
      const trip = Trip.create({
        busId: bus.id,
        routeId: route.id,
        departureTime,
        totalSeats: bus.capacity,
        price,
        arrivalEstimate,
      });

      console.log(`[Generate Trips] Creating trip: route_id=${route.id}, bus_id=${bus.id}, departure_time=${departureTime.toISOString()}, hour=${schedule.hour}, status=${trip.status}`);

      const createdTrip = await tripRepository.create(trip);
      console.log(`[Generate Trips] Trip created successfully: ${createdTrip.id}, departure_time=${createdTrip.departureTime.toISOString()}`);
      createdTrips.push(createdTrip);
    }

    return NextResponse.json({
      message: `Se generaron ${createdTrips.length} trips exitosamente`,
      trips: createdTrips,
      skipped: skippedTrips.length > 0 ? skippedTrips : undefined,
      summary: {
        created: createdTrips.length,
        skipped: skippedTrips.length,
        total: assignments.length,
      },
    });
  } catch (error) {
    console.error("Error generating trips:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to generate trips" },
      { status: 500 }
    );
  }
}

