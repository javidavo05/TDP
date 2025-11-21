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
    const today = format(now, "yyyy-MM-dd");
    const fourHoursLater = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const endDate = format(fourHoursLater, "yyyy-MM-dd");

    // Get schedule assignments for today and next 4 hours
    const { data: assignments, error: assignmentsError } = await supabase
      .from("schedule_assignments")
      .select(`
        id,
        date,
        schedules (
          id,
          hour,
          is_express,
          routes (
            id,
            origin,
            destination
          )
        ),
        buses (
          id,
          plate_number,
          unit_number
        )
      `)
      .gte("date", today)
      .lte("date", endDate)
      .eq("date", today); // Only today for now

    if (assignmentsError) {
      throw new Error(`Failed to fetch assignments: ${assignmentsError.message}`);
    }

    // Transform data
    const departures = (assignments || [])
      .filter((a: any) => a.schedules && a.buses)
      .map((assignment: any) => {
        const schedule = assignment.schedules;
        const bus = assignment.buses;
        const route = schedule.routes;

        // Determine status based on current time
        const depTime = new Date(assignment.date);
        depTime.setHours(schedule.hour, 0, 0, 0);
        const now = new Date();
        const minutesUntil = (depTime.getTime() - now.getTime()) / (1000 * 60);

        let status: "scheduled" | "boarding" | "departed" | "delayed" = "scheduled";
        if (minutesUntil < -30) {
          status = "departed";
        } else if (minutesUntil < 0 && minutesUntil >= -30) {
          status = "departed";
        } else if (minutesUntil >= 0 && minutesUntil <= 30) {
          status = "boarding";
        }

        return {
          id: assignment.id,
          hour: schedule.hour,
          isExpress: schedule.is_express,
          busPlateNumber: bus.plate_number,
          busUnitNumber: bus.unit_number,
          routeOrigin: route?.origin || "N/A",
          routeDestination: route?.destination || "N/A",
          status,
        };
      })
      .filter((dep: any) => {
        // Only show departures in the next 4 hours
        const depTime = new Date();
        depTime.setHours(dep.hour, 0, 0, 0);
        const hoursUntil = (depTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursUntil >= 0 && hoursUntil <= 4;
      })
      .sort((a: any, b: any) => a.hour - b.hour);

    return NextResponse.json({ departures });
  } catch (error) {
    console.error("Error fetching departures:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch departures" },
      { status: 500 }
    );
  }
}

