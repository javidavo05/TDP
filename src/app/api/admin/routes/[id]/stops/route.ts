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

    const stops = await routeService.getRouteStops(params.id);
    return NextResponse.json({ stops });
  } catch (error) {
    console.error("Error fetching stops:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch stops" },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const { name, kmPosition, orderIndex, priceAdjustment } = body;

    if (!name || kmPosition === undefined || orderIndex === undefined) {
      return NextResponse.json(
        { error: "name, kmPosition, and orderIndex are required" },
        { status: 400 }
      );
    }

    const stop = await routeService.addRouteStop(params.id, {
      name,
      kmPosition,
      orderIndex,
      priceAdjustment,
    });

    return NextResponse.json({ stop }, { status: 201 });
  } catch (error) {
    console.error("Error adding stop:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to add stop" },
      { status: 400 }
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
    const { stopIds } = body;

    if (!stopIds || !Array.isArray(stopIds)) {
      return NextResponse.json(
        { error: "stopIds array is required" },
        { status: 400 }
      );
    }

    await routeService.reorderRouteStops(params.id, stopIds);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering stops:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to reorder stops" },
      { status: 400 }
    );
  }
}
