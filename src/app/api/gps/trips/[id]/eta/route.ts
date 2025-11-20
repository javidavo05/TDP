import { NextRequest, NextResponse } from "next/server";
import { GPSService } from "@/services/gps/GPSService";
import { GPSRepository } from "@/infrastructure/db/supabase/GPSRepository";
import { TripRepository } from "@/infrastructure/db/supabase/TripRepository";

const gpsService = new GPSService(
  new GPSRepository(),
  new TripRepository()
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tripId = params.id;
    
    // Get trip to find destination
    const trip = await gpsService["tripRepository"].findById(tripId);
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // TODO: Get destination coordinates from route
    // For now, return null
    const eta = null; // await gpsService.calculateETA(tripId, destLat, destLng);

    return NextResponse.json({ eta });
  } catch (error: any) {
    console.error("Error calculating ETA:", error);
    return NextResponse.json(
      { error: error.message || "Error al calcular ETA" },
      { status: 500 }
    );
  }
}

