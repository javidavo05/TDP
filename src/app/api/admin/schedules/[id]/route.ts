import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ScheduleService } from "@/services/admin/ScheduleService";
import { ScheduleRepository } from "@/infrastructure/db/supabase/ScheduleRepository";

export const dynamic = 'force-dynamic';

const scheduleRepository = new ScheduleRepository();
const scheduleService = new ScheduleService(scheduleRepository);

export async function GET(
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

    if (!["admin", "bus_owner"].includes(userData.data?.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const schedule = await scheduleService.getScheduleById(params.id);
    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("Error fetching schedule:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    if (userData.data?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const schedule = await scheduleService.getScheduleById(params.id);
    
    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    // Update schedule fields
    if (body.isExpress !== undefined) schedule.isExpress = body.isExpress;
    if (body.expressPriceMultiplier !== undefined) schedule.expressPriceMultiplier = body.expressPriceMultiplier;
    if (body.isActive !== undefined) schedule.isActive = body.isActive;
    schedule.updatedAt = new Date();

    const updated = await scheduleService.updateSchedule(schedule);
    return NextResponse.json({ schedule: updated });
  } catch (error) {
    console.error("Error updating schedule:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to update schedule" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    if (userData.data?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await scheduleService.deleteSchedule(params.id);
    return NextResponse.json({ message: "Schedule deleted successfully" });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to delete schedule" },
      { status: 500 }
    );
  }
}

