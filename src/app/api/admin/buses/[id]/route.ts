import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BusRepository } from "@/infrastructure/db/supabase/BusRepository";
import { BusService } from "@/services/admin/BusService";

export const dynamic = 'force-dynamic';

const busRepository = new BusRepository();
const busService = new BusService(busRepository);

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

    const bus = await busRepository.findById(params.id);

    if (!bus) {
      return NextResponse.json({ error: "Bus not found" }, { status: 404 });
    }

    // If bus_owner, verify they own this bus
    if (userData.data?.role === "bus_owner") {
      const { data: busOwner } = await supabase
        .from("bus_owners")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!busOwner || bus.ownerId !== busOwner.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ bus });
  } catch (error) {
    console.error("Error fetching bus:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch bus" },
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

    if (!["admin", "bus_owner"].includes(userData.data?.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get existing bus to verify ownership
    const existingBus = await busRepository.findById(params.id);
    if (!existingBus) {
      return NextResponse.json({ error: "Bus not found" }, { status: 404 });
    }

    // If bus_owner, verify they own this bus
    if (userData.data?.role === "bus_owner") {
      const { data: busOwner } = await supabase
        .from("bus_owners")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!busOwner || existingBus.ownerId !== busOwner.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await request.json();
    const { plateNumber, unitNumber, model, year, capacity, busClass, features, mechanicalNotes, seatMap, isActive, odometer } = body;

    // Update bus
    const updatedBus = await busService.updateBus(params.id, {
      plateNumber: plateNumber || existingBus.plateNumber,
      unitNumber: unitNumber !== undefined ? unitNumber : existingBus.unitNumber,
      model: model !== undefined ? model : existingBus.model,
      year: year !== undefined ? year : existingBus.year,
      capacity: capacity !== undefined ? parseInt(capacity) : existingBus.capacity,
      busClass: busClass || existingBus.busClass,
      features: features || existingBus.features,
      mechanicalNotes: mechanicalNotes !== undefined ? mechanicalNotes : existingBus.mechanicalNotes,
      odometer: odometer !== undefined ? parseFloat(odometer) : existingBus.odometer,
      seatMap: seatMap || existingBus.seatMap,
      isActive: isActive !== undefined ? isActive : existingBus.isActive,
    });

    return NextResponse.json({ bus: updatedBus });
  } catch (error) {
    console.error("Error updating bus:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to update bus" },
      { status: 500 }
    );
  }
}

