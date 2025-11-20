import { NextRequest, NextResponse } from "next/server";
import { RouteRepository } from "@/infrastructure/db/supabase/RouteRepository";
import { RouteService } from "@/services/admin/RouteService";
import { createClient } from "@/lib/supabase/server";

const routeRepository = new RouteRepository();
const routeService = new RouteService(routeRepository);

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    const result = await routeService.listRoutes({ page, limit, offset });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching routes:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch routes" },
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
    const { name, origin, destination, basePrice, distanceKm, estimatedDurationMinutes } = body;

    if (!name || !origin || !destination || basePrice === undefined) {
      return NextResponse.json(
        { error: "name, origin, destination, and basePrice are required" },
        { status: 400 }
      );
    }

    const route = await routeService.createRoute({
      name,
      origin,
      destination,
      basePrice,
      distanceKm,
      estimatedDurationMinutes,
    });

    return NextResponse.json({ route }, { status: 201 });
  } catch (error) {
    console.error("Error creating route:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to create route" },
      { status: 400 }
    );
  }
}
