import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("pos_display_sessions")
      .select("*, trips(*, routes(*)), seats(*)")
      .eq("session_id", params.sessionId)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Session not found or expired" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      selectedSeat: data.seats,
      trip: data.trips,
      session: data,
    });
  } catch (error) {
    console.error("Error fetching display session:", error);
    return NextResponse.json(
      { error: "Failed to fetch display session" },
      { status: 500 }
    );
  }
}

