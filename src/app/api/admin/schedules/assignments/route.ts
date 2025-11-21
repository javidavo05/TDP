import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ScheduleAssignmentService } from "@/services/admin/ScheduleAssignmentService";
import { ScheduleAssignmentRepository } from "@/infrastructure/db/supabase/ScheduleAssignmentRepository";

export const dynamic = 'force-dynamic';

const assignmentRepository = new ScheduleAssignmentRepository();
const assignmentService = new ScheduleAssignmentService(assignmentRepository);

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
    const dateStr = searchParams.get("date");
    const scheduleId = searchParams.get("scheduleId");
    const busId = searchParams.get("busId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (dateStr && scheduleId) {
      const date = new Date(dateStr);
      const assignments = await assignmentService.getAssignmentsByScheduleAndDate(scheduleId, date);
      return NextResponse.json({ assignments });
    }

    if (dateStr && busId) {
      const date = new Date(dateStr);
      const assignments = await assignmentService.getAssignmentsByBusAndDate(busId, date);
      return NextResponse.json({ assignments });
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const assignments = await assignmentService.getAssignmentsByDateRange(start, end);
      return NextResponse.json({ assignments });
    }

    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch assignments" },
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
    const { scheduleId, busId, date, driverId, assistantId } = body;

    if (!scheduleId || !busId || !date) {
      return NextResponse.json(
        { error: "scheduleId, busId, and date are required" },
        { status: 400 }
      );
    }

    // Validate driver hours if driverId is provided
    if (driverId) {
      try {
        const { DriverHoursService } = await import("@/services/admin/DriverHoursService");
        const { DriverHoursRepository } = await import("@/infrastructure/db/supabase/DriverHoursRepository");
        const { DriverHoursConfigRepository } = await import("@/infrastructure/db/supabase/DriverHoursConfigRepository");
        
        const hoursRepo = new DriverHoursRepository();
        const configRepo = new DriverHoursConfigRepository();
        const hoursService = new DriverHoursService(hoursRepo, configRepo);

        // Get schedule to determine trip start time
        const { ScheduleRepository } = await import("@/infrastructure/db/supabase/ScheduleRepository");
        const scheduleRepo = new ScheduleRepository();
        const schedule = await scheduleRepo.findById(scheduleId);
        
        if (schedule) {
          const tripStartTime = new Date(date);
          tripStartTime.setHours(schedule.hour, 0, 0, 0);
          
          const validation = await hoursService.canAssignTrip(driverId, tripStartTime);
          if (!validation.allowed) {
            return NextResponse.json(
              { error: validation.reason || "Driver hours limit exceeded" },
              { status: 400 }
            );
          }
        }
      } catch (error) {
        console.error("Error validating driver hours:", error);
        // Continue with assignment if validation fails (non-blocking)
      }
    }

    const assignment = await assignmentService.assignBusToSchedule({
      scheduleId,
      busId,
      date: new Date(date),
      driverId,
      assistantId,
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    console.error("Error creating assignment:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to create assignment" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const { assignmentId, newBusId, reason } = body;

    if (!assignmentId || !newBusId || !reason) {
      return NextResponse.json(
        { error: "assignmentId, newBusId, and reason are required" },
        { status: 400 }
      );
    }

    if (!reason.trim()) {
      return NextResponse.json(
        { error: "Reason is required and cannot be empty" },
        { status: 400 }
      );
    }

    const result = await assignmentService.updateAssignmentBus(
      assignmentId,
      newBusId,
      reason.trim(),
      user.id
    );

    return NextResponse.json({ 
      assignment: result.assignment,
      change: result.change 
    });
  } catch (error) {
    console.error("Error updating assignment:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to update assignment" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get("scheduleId");
    const busId = searchParams.get("busId");
    const date = searchParams.get("date");
    const id = searchParams.get("id");

    if (id) {
      await assignmentService.removeAssignmentById(id);
      return NextResponse.json({ message: "Assignment deleted successfully" });
    }

    if (scheduleId && busId && date) {
      await assignmentService.removeAssignment(scheduleId, busId, new Date(date));
      return NextResponse.json({ message: "Assignment deleted successfully" });
    }

    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  } catch (error) {
    console.error("Error deleting assignment:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to delete assignment" },
      { status: 500 }
    );
  }
}

