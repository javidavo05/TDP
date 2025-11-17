import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get latest GPS position
    const { data: latest, error: latestError } = await supabase
      .from("gps_logs")
      .select("*")
      .eq("trip_id", params.id)
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    if (latestError && latestError.code !== "PGRST116") {
      throw new Error(`Failed to get GPS: ${latestError.message}`);
    }

    // Get history (last 100 points)
    const { data: history, error: historyError } = await supabase
      .from("gps_logs")
      .select("*")
      .eq("trip_id", params.id)
      .order("timestamp", { ascending: false })
      .limit(100);

    if (historyError) {
      throw new Error(`Failed to get GPS history: ${historyError.message}`);
    }

    return NextResponse.json({
      latest: latest
        ? {
            latitude: parseFloat(latest.latitude),
            longitude: parseFloat(latest.longitude),
            speed: latest.speed ? parseFloat(latest.speed) : null,
            heading: latest.heading ? parseFloat(latest.heading) : null,
            timestamp: latest.timestamp,
          }
        : null,
      history: (history || []).map((h: any) => ({
        latitude: parseFloat(h.latitude),
        longitude: parseFloat(h.longitude),
        speed: h.speed ? parseFloat(h.speed) : null,
        heading: h.heading ? parseFloat(h.heading) : null,
        timestamp: h.timestamp,
      })),
    });
  } catch (error) {
    console.error("Error fetching GPS data:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch GPS data" },
      { status: 500 }
    );
  }
}

