import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BusAssignmentChangeRepository } from "@/infrastructure/db/supabase/BusAssignmentChangeRepository";

export const dynamic = 'force-dynamic';

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

    const changeRepository = new BusAssignmentChangeRepository();
    const changes = await changeRepository.findByBusId(params.id);

    // Enrich with bus and user information
    const enrichedChanges = await Promise.all(
      changes.map(async (change) => {
        const [oldBus, newBus, changedByUser, assignment] = await Promise.all([
          change.oldBusId
            ? supabase.from("buses").select("plate_number, unit_number").eq("id", change.oldBusId).single()
            : Promise.resolve({ data: null }),
          supabase.from("buses").select("plate_number, unit_number").eq("id", change.newBusId).single(),
          supabase.from("users").select("full_name, email").eq("id", change.changedBy).single(),
          supabase
            .from("schedule_assignments")
            .select("date, schedules(hour, is_express, routes(origin, destination))")
            .eq("id", change.assignmentId)
            .single(),
        ]);

        return {
          id: change.id,
          assignmentId: change.assignmentId,
          oldBus: oldBus.data
            ? {
                id: change.oldBusId,
                plateNumber: oldBus.data.plate_number,
                unitNumber: oldBus.data.unit_number,
              }
            : null,
          newBus: {
            id: change.newBusId,
            plateNumber: newBus.data?.plate_number,
            unitNumber: newBus.data?.unit_number,
          },
          reason: change.reason,
          changedBy: {
            id: change.changedBy,
            name: changedByUser.data?.full_name,
            email: changedByUser.data?.email,
          },
          changedAt: change.changedAt,
          assignment: assignment.data
            ? (() => {
                const schedule = Array.isArray(assignment.data.schedules)
                  ? assignment.data.schedules[0]
                  : (assignment.data.schedules as any);
                return {
                  date: assignment.data.date,
                  hour: schedule?.hour,
                  isExpress: schedule?.is_express,
                  route: schedule?.routes
                    ? {
                        origin: schedule.routes.origin,
                        destination: schedule.routes.destination,
                      }
                    : null,
                };
              })()
            : null,
        };
      })
    );

    return NextResponse.json({ changes: enrichedChanges });
  } catch (error) {
    console.error("Error fetching assignment changes:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch assignment changes" },
      { status: 500 }
    );
  }
}

