import { NextResponse } from "next/server";
import { TripRepository } from "@/infrastructure/db/supabase/TripRepository";
import { TicketingService } from "@/services/public/ticketing/TicketingService";
import { TicketRepository } from "@/infrastructure/db/supabase/TicketRepository";
import { getGlobalCache } from "@/lib/cache/MemoryCache";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

const tripRepository = new TripRepository();
const ticketRepository = new TicketRepository();
const ticketingService = new TicketingService(ticketRepository, tripRepository);
const cache = getGlobalCache();

const CACHE_KEY = "trips:upcoming";
const CACHE_TTL = 30000; // 30 seconds

export async function GET() {
  try {
    // Try cache first
    const cached = cache.get<any>(CACHE_KEY);
    if (cached) {
      return NextResponse.json({ trips: cached }, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          'X-Cache': 'HIT',
        },
      });
    }

    // Fetch from database
    const trips = await ticketingService.getUpcomingTrips(24);
    
    // Enrich trips with route and bus information
    const supabase = await createClient();
    const enrichedTrips = await Promise.all(
      trips.map(async (trip) => {
        // Fetch route information
        const { data: routeData } = await supabase
          .from("routes")
          .select("id, name, origin, destination, base_price, estimated_duration_minutes")
          .eq("id", trip.routeId)
          .single();

        // Fetch bus information
        const { data: busData } = await supabase
          .from("buses")
          .select("id, bus_class, features, seat_map")
          .eq("id", trip.busId)
          .single();

        // Calculate arrival time if not set
        let arrivalTime = trip.arrivalEstimate?.toISOString() || null;
        if (!arrivalTime && routeData?.estimated_duration_minutes) {
          const estimatedArrival = new Date(trip.departureTime);
          estimatedArrival.setMinutes(
            estimatedArrival.getMinutes() + routeData.estimated_duration_minutes
          );
          arrivalTime = estimatedArrival.toISOString();
        }

        return {
          id: trip.id,
          origin: routeData?.origin || "",
          destination: routeData?.destination || "",
          departureTime: trip.departureTime.toISOString(),
          arrivalTime,
          price: trip.price,
          availableSeats: trip.availableSeats,
          totalSeats: trip.totalSeats,
          busClass: busData?.bus_class || "economico",
          bus: {
            features: busData?.features || {},
          },
          route: {
            id: routeData?.id || "",
            name: routeData?.name || "",
            origin: routeData?.origin || "",
            destination: routeData?.destination || "",
          },
        };
      })
    );
    
    // Cache the result
    cache.set(CACHE_KEY, enrichedTrips, CACHE_TTL);

    return NextResponse.json({ trips: enrichedTrips }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error("Error fetching upcoming trips:", error);
    return NextResponse.json(
      { error: "Failed to fetch upcoming trips" },
      { status: 500 }
    );
  }
}

