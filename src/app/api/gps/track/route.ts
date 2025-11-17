import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { IGPSRepository } from "@/domain/repositories";
import { GPSCoordinates } from "@/domain/types";

// Placeholder GPS Repository implementation
class GPSRepository implements IGPSRepository {
  async log(tripId: string, busId: string, coordinates: GPSCoordinates): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("gps_logs").insert({
      trip_id: tripId,
      bus_id: busId,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      speed: coordinates.speed || null,
      heading: coordinates.heading || null,
      timestamp: coordinates.timestamp.toISOString(),
    });

    if (error) {
      throw new Error(`Failed to log GPS: ${error.message}`);
    }
  }

  async getLatest(tripId: string): Promise<GPSCoordinates | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("gps_logs")
      .select("*")
      .eq("trip_id", tripId)
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    return {
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
      speed: data.speed ? parseFloat(data.speed) : undefined,
      heading: data.heading ? parseFloat(data.heading) : undefined,
      timestamp: new Date(data.timestamp),
    };
  }

  async getHistory(tripId: string, startDate?: Date, endDate?: Date): Promise<GPSCoordinates[]> {
    const supabase = await createClient();
    let query = supabase
      .from("gps_logs")
      .select("*")
      .eq("trip_id", tripId)
      .order("timestamp", { ascending: true });

    if (startDate) {
      query = query.gte("timestamp", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("timestamp", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get GPS history: ${error.message}`);
    }

    return (data || []).map((d: any) => ({
      latitude: parseFloat(d.latitude),
      longitude: parseFloat(d.longitude),
      speed: d.speed ? parseFloat(d.speed) : undefined,
      heading: d.heading ? parseFloat(d.heading) : undefined,
      timestamp: new Date(d.timestamp),
    }));
  }

  async getByBus(busId: string, limit: number = 100): Promise<GPSCoordinates[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("gps_logs")
      .select("*")
      .eq("bus_id", busId)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get GPS by bus: ${error.message}`);
    }

    return (data || []).map((d: any) => ({
      latitude: parseFloat(d.latitude),
      longitude: parseFloat(d.longitude),
      speed: d.speed ? parseFloat(d.speed) : undefined,
      heading: d.heading ? parseFloat(d.heading) : undefined,
      timestamp: new Date(d.timestamp),
    }));
  }
}

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

