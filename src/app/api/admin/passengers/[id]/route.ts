import { NextRequest, NextResponse } from "next/server";
import { PassengerRepository } from "@/infrastructure/db/supabase/PassengerRepository";
import { PassengerService } from "@/services/admin/PassengerService";
import { createClient } from "@/lib/supabase/server";

const passengerRepository = new PassengerRepository();
const passengerService = new PassengerService(passengerRepository);

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

    // Check if user is admin or bus owner
    const userData = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!["admin", "bus_owner"].includes(userData.data?.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const passenger = await passengerService.getPassengerById(params.id);
    if (!passenger) {
      return NextResponse.json({ error: "Passenger not found" }, { status: 404 });
    }

    // Get passenger tickets and trip history
    const { data: tickets } = await supabase
      .from("tickets")
      .select(`
        *,
        trips (
          id,
          departure_time,
          arrival_estimate,
          routes (
            id,
            origin,
            destination
          )
        ),
        seats (
          id,
          seat_number
        )
      `)
      .eq("passenger_id", params.id)
      .order("created_at", { ascending: false });

    // Get trip manifest entries
    const { data: manifest } = await supabase
      .from("trip_manifest")
      .select(`
        *,
        trips (
          id,
          departure_time,
          routes (
            id,
            origin,
            destination
          )
        )
      `)
      .eq("passenger_id", params.id)
      .order("validated_at", { ascending: false });

    return NextResponse.json({
      passenger,
      tickets: tickets || [],
      manifest: manifest || [],
    });
  } catch (error) {
    console.error("Error fetching passenger:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch passenger" },
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

    // Check if user is admin
    const userData = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData.data?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { fullName, phone, email, dateOfBirth, address } = body;

    const passenger = await passengerService.updatePassenger(params.id, {
      fullName,
      phone,
      email,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      address,
    });

    return NextResponse.json({ passenger });
  } catch (error) {
    console.error("Error updating passenger:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to update passenger" },
      { status: 400 }
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

    // Check if user is admin
    const userData = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData.data?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await passengerService.deletePassenger(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting passenger:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to delete passenger" },
      { status: 400 }
    );
  }
}

