import { NextRequest, NextResponse } from "next/server";
import { RouteRepository } from "@/infrastructure/db/supabase/RouteRepository";
import { RouteService } from "@/services/admin/RouteService";
import { createClient } from "@/lib/supabase/server";

const routeRepository = new RouteRepository();
const routeService = new RouteService(routeRepository);

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

    const route = await routeService.getRouteById(params.id);
    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    // Get route stops
    const stops = await routeService.getRouteStops(params.id);

    return NextResponse.json({ route, stops });
  } catch (error) {
    console.error("Error fetching route:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch route" },
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
    const { name, origin, destination, basePrice, distanceKm, estimatedDurationMinutes, isActive, isExpress, expressPriceMultiplier } = body;

    const route = await routeService.updateRoute(params.id, {
      name,
      origin,
      destination,
      basePrice,
      distanceKm,
      estimatedDurationMinutes,
      isActive,
      isExpress,
      expressPriceMultiplier,
    });

    return NextResponse.json({ route });
  } catch (error) {
    console.error("Error updating route:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to update route" },
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

    await routeService.deleteRoute(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting route:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to delete route" },
      { status: 400 }
    );
  }
}
