import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ScheduleService } from "@/services/admin/ScheduleService";
import { ScheduleRepository } from "@/infrastructure/db/supabase/ScheduleRepository";

export const dynamic = 'force-dynamic';

const scheduleRepository = new ScheduleRepository();
const scheduleService = new ScheduleService(scheduleRepository);

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

    const { searchParams } = new URL(request.url);
    const routeId = searchParams.get("routeId");

    if (routeId) {
      const schedules = await scheduleService.getSchedulesByRoute(routeId);
      return NextResponse.json({ schedules });
    }

    return NextResponse.json({ error: "routeId is required" }, { status: 400 });
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch schedules" },
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
    const { routeId, hour, isExpress, expressPriceMultiplier } = body;

    if (!routeId || hour === undefined) {
      return NextResponse.json(
        { error: "routeId and hour are required" },
        { status: 400 }
      );
    }

    const schedule = await scheduleService.createSchedule({
      routeId,
      hour: parseInt(hour),
      isExpress: isExpress || false,
      expressPriceMultiplier: expressPriceMultiplier || 1.0,
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    console.error("Error creating schedule:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to create schedule" },
      { status: 500 }
    );
  }
}

