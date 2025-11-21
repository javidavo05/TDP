import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DriverHoursService } from "@/services/admin/DriverHoursService";
import { DriverHoursRepository } from "@/infrastructure/db/supabase/DriverHoursRepository";
import { DriverHoursConfigRepository } from "@/infrastructure/db/supabase/DriverHoursConfigRepository";
import { DriverHoursConfig } from "@/domain/entities";

export const dynamic = 'force-dynamic';

const hoursRepository = new DriverHoursRepository();
const configRepository = new DriverHoursConfigRepository();
const hoursService = new DriverHoursService(hoursRepository, configRepository);

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

    if (!["admin", "driver"].includes(userData.data?.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get("driverId");
    const action = searchParams.get("action");

    // Get config
    if (action === "config") {
      const config = await hoursService.getConfig();
      return NextResponse.json({ config });
    }

    // Get summary for a driver
    if (driverId && action === "summary") {
      const summary = await hoursService.getDriverHoursSummary(driverId);
      return NextResponse.json({ summary });
    }

    // Get hours for a driver
    if (driverId) {
      const hours = await hoursRepository.findByDriver(driverId);
      return NextResponse.json({ hours });
    }

    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  } catch (error) {
    console.error("Error fetching driver hours:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch driver hours" },
      { status: 500 }
    );
  }
}

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
    const { action } = body;

    // Update config
    if (action === "updateConfig") {
      const { config } = body;
      const configEntity = new DriverHoursConfig(
        config.id,
        config.maxHoursPerDay,
        config.maxHoursPerWeek,
        config.maxHoursPerMonth,
        config.restHoursRequired,
        new Date()
      );
      const updated = await hoursService.updateConfig(configEntity);
      return NextResponse.json({ config: updated });
    }

    // Start trip
    if (action === "startTrip") {
      const { driverId, tripId, startTime } = body;
      const hours = await hoursService.startTrip(driverId, tripId, new Date(startTime));
      return NextResponse.json({ hours }, { status: 201 });
    }

    // End trip
    if (action === "endTrip") {
      const { tripId, endTime } = body;
      const hours = await hoursService.endTrip(tripId, new Date(endTime));
      return NextResponse.json({ hours });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing driver hours:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to process driver hours" },
      { status: 500 }
    );
  }
}

