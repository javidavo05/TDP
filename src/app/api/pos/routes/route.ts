import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RouteRepository } from "@/infrastructure/db/supabase/RouteRepository";

export const dynamic = 'force-dynamic';

const routeRepository = new RouteRepository();

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is POS agent or admin
    const userData = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!["admin", "pos_agent"].includes(userData.data?.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all active routes
    const routes = await routeRepository.findAll({ limit: 1000 });

    // Format routes for POS display
    const formattedRoutes = routes.data.map((route) => ({
      id: route.id,
      name: route.name,
      origin: route.origin,
      destination: route.destination,
      basePrice: route.basePrice,
      isExpress: route.isExpress,
      expressPriceMultiplier: route.expressPriceMultiplier,
      isActive: route.isActive,
      routeLabel: `${route.origin} → ${route.destination}`,
    }));

    return NextResponse.json({ routes: formattedRoutes });
  } catch (error) {
    console.error("Error fetching POS routes:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch routes" },
      { status: 500 }
    );
  }
}

