import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DriverHoursService } from "@/services/admin/DriverHoursService";
import { DriverHoursRepository } from "@/infrastructure/db/supabase/DriverHoursRepository";
import { DriverHoursConfigRepository } from "@/infrastructure/db/supabase/DriverHoursConfigRepository";

export const dynamic = 'force-dynamic';

const hoursRepository = new DriverHoursRepository();
const configRepository = new DriverHoursConfigRepository();
const hoursService = new DriverHoursService(hoursRepository, configRepository);

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

    if (!["admin", "bus_owner"].includes(userData.data?.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { driverId, tripStartTime } = body;

    if (!driverId || !tripStartTime) {
      return NextResponse.json(
        { error: "driverId and tripStartTime are required" },
        { status: 400 }
      );
    }

    const validation = await hoursService.canAssignTrip(driverId, new Date(tripStartTime));

    return NextResponse.json(validation);
  } catch (error) {
    console.error("Error validating driver hours:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to validate driver hours" },
      { status: 500 }
    );
  }
}

