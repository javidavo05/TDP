import { NextRequest, NextResponse } from "next/server";
import { RouteRepository } from "@/infrastructure/db/supabase/RouteRepository";
import { RouteService } from "@/services/admin/RouteService";
import { createClient } from "@/lib/supabase/server";

const routeRepository = new RouteRepository();
const routeService = new RouteService(routeRepository);

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; stopId: string } }
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
    const { name, kmPosition, orderIndex, price } = body;

    const stop = await routeService.updateRouteStop(params.stopId, {
      name,
      kmPosition,
      orderIndex,
      price, // Complete ticket price for this stop
    });

    return NextResponse.json({ stop });
  } catch (error) {
    console.error("Error updating stop:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to update stop" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; stopId: string } }
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

    await routeService.deleteRouteStop(params.stopId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting stop:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to delete stop" },
      { status: 400 }
    );
  }
}

