import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSessionId } from "@/lib/utils";
import { DISPLAY_SESSION_TIMEOUT } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tripId, seatId } = body;

    if (!tripId || !seatId) {
      return NextResponse.json(
        { error: "tripId and seatId are required" },
        { status: 400 }
      );
    }

    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + DISPLAY_SESSION_TIMEOUT);

    const { data, error } = await supabase
      .from("pos_display_sessions")
      .insert({
        session_id: sessionId,
        trip_id: tripId,
        selected_seat_id: seatId,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create display session: ${error.message}`);
    }

    return NextResponse.json({ sessionId, session: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating display session:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to create display session" },
      { status: 500 }
    );
  }
}

