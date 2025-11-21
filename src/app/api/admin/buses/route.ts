import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BusRepository } from "@/infrastructure/db/supabase/BusRepository";
import { BusService } from "@/services/admin/BusService";

export const dynamic = 'force-dynamic';

const busRepository = new BusRepository();
const busService = new BusService(busRepository);

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

    // If bus_owner, filter by their buses
    if (userData.data?.role === "bus_owner") {
      const { data: busOwner } = await supabase
        .from("bus_owners")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (busOwner) {
        const result = await busRepository.findByOwner(busOwner.id);
        return NextResponse.json({ buses: result.data });
      }
    }

    // Admin sees all buses
    const result = await busRepository.findAll();
    const buses = result.data;
    
    // Enrich buses with last trip date
    const adminClient = createAdminClient();
    const enrichedBuses = await Promise.all(
      buses.map(async (bus) => {
        // Get last completed trip for this bus
        const { data: lastTrip } = await adminClient
          .from("trips")
          .select("departure_time")
          .eq("bus_id", bus.id)
          .eq("status", "completed")
          .order("departure_time", { ascending: false })
          .limit(1)
          .single();
        
        return {
          ...bus,
          lastTripDate: lastTrip?.departure_time || null,
        };
      })
    );
    
    return NextResponse.json({ buses: enrichedBuses });
  } catch (error) {
    console.error("Error fetching buses:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch buses" },
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

    if (!["admin", "bus_owner"].includes(userData.data?.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { plateNumber, unitNumber, model, year, capacity, busClass, features, mechanicalNotes, seatMap, odometer } = body;

    if (!plateNumber || !capacity || !seatMap) {
      return NextResponse.json(
        { error: "plateNumber, capacity, and seatMap are required" },
        { status: 400 }
      );
    }

    // Get owner_id
    let ownerId: string;
    if (userData.data?.role === "bus_owner") {
      let { data: busOwner } = await supabase
        .from("bus_owners")
        .select("id")
        .eq("user_id", user.id)
        .single();

      // If bus_owner record doesn't exist, create it automatically
      if (!busOwner) {
        const adminClient = createAdminClient();
        
        // Get user info for company name
        const { data: userInfo } = await adminClient
          .from("users")
          .select("full_name, email")
          .eq("id", user.id)
          .single();

        const companyName = userInfo?.full_name 
          ? `${userInfo.full_name} - Empresa`
          : userInfo?.email?.split("@")[0] || "Empresa";

        const { data: newBusOwner, error: createError } = await adminClient
          .from("bus_owners")
          .insert({
            user_id: user.id,
            company_name: companyName,
            email: userInfo?.email || null,
          })
          .select("id")
          .single();

        if (createError || !newBusOwner) {
          console.error("Error creating bus_owner record:", createError);
          return NextResponse.json(
            { error: "Failed to create bus owner record. Please contact administrator." },
            { status: 500 }
          );
        }

        busOwner = newBusOwner;
      }
      ownerId = busOwner.id;
    } else {
      // Admin needs to specify ownerId
      if (!body.ownerId) {
        return NextResponse.json({ error: "ownerId is required for admin" }, { status: 400 });
      }
      ownerId = body.ownerId;
    }

    // Note: The BusRepository handles the case where mechanical_notes column doesn't exist
    // by retrying without it if there's a schema cache error. The migration 015 should
    // be run in Supabase to add the column permanently.

    const bus = await busService.createBus({
      ownerId,
      plateNumber,
      unitNumber: unitNumber || null,
      model: model || null,
      year: year || null,
      capacity: parseInt(capacity),
      busClass: busClass || "economico",
      features: features || {},
      mechanicalNotes: mechanicalNotes || null,
      odometer: odometer ? parseFloat(odometer) : 0,
      seatMap,
    });

    return NextResponse.json({ bus }, { status: 201 });
  } catch (error) {
    console.error("Error creating bus:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to create bus" },
      { status: 500 }
    );
  }
}

