import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is driver
    const userData = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData.data?.role !== "driver") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get trip to verify it exists and get route info
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id, route_id")
      .eq("id", params.tripId)
      .single();

    if (tripError || !trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Get all tickets for this trip with destination stops
    const { data: tickets, error: ticketsError } = await supabase
      .from("tickets")
      .select(`
        id,
        passenger_name,
        seat_id,
        destination_stop_id,
        boarding_stop_id,
        status,
        destination_stop:route_stops!tickets_destination_stop_id_fkey (
          id,
          name,
          km_position,
          order_index
        )
      `)
      .eq("trip_id", params.tripId)
      .in("status", ["pending", "confirmed", "boarded"]); // Only active tickets

    if (ticketsError) {
      throw new Error(`Failed to fetch tickets: ${ticketsError.message}`);
    }

    // Group tickets by destination stop
    const stopsMap = new Map<string, {
      stopId: string;
      stopName: string;
      kmPosition: number;
      orderIndex: number;
      passengerCount: number;
      passengers: Array<{
        ticketId: string;
        passengerName: string;
        seatId: string;
        boardingStopId: string | null;
        status: string;
      }>;
    }>();

    (tickets || []).forEach((ticket: any) => {
      if (!ticket.destination_stop_id || !ticket.destination_stop) {
        return; // Skip tickets without destination stop
      }

      const stopId = ticket.destination_stop_id;
      const stop = ticket.destination_stop;

      if (!stopsMap.has(stopId)) {
        stopsMap.set(stopId, {
          stopId,
          stopName: stop.name,
          kmPosition: parseFloat(stop.km_position),
          orderIndex: stop.order_index,
          passengerCount: 0,
          passengers: [],
        });
      }

      const stopData = stopsMap.get(stopId)!;
      stopData.passengerCount++;
      stopData.passengers.push({
        ticketId: ticket.id,
        passengerName: ticket.passenger_name,
        seatId: ticket.seat_id,
        boardingStopId: ticket.boarding_stop_id,
        status: ticket.status,
      });
    });

    // Convert map to array and sort by order_index
    const stops = Array.from(stopsMap.values()).sort((a, b) => a.orderIndex - b.orderIndex);

    return NextResponse.json({ stops });
  } catch (error) {
    console.error("Error fetching trip stops:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch trip stops" },
      { status: 500 }
    );
  }
}

