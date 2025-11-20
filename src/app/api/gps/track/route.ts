import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GPSRepository } from "@/infrastructure/db/supabase/GPSRepository";

const gpsRepository = new GPSRepository();

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Check if user is driver
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData.data?.role !== "driver") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { tripId, busId, latitude, longitude, speed, heading } = body;

    if (!tripId || !busId || !latitude || !longitude) {
      return NextResponse.json(
        { error: "tripId, busId, latitude, and longitude are required" },
        { status: 400 }
      );
    }

    await gpsRepository.log(tripId, busId, {
      latitude,
      longitude,
      speed,
      heading,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error tracking GPS:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to track GPS" },
      { status: 500 }
    );
  }
}

