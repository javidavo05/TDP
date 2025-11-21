import { NextRequest, NextResponse } from "next/server";
import { AnalyticsService } from "@/services/analytics/AnalyticsService";
import { AnalyticsRepository } from "@/infrastructure/db/supabase/AnalyticsRepository";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

const analyticsRepository = new AnalyticsRepository();
const analyticsService = new AnalyticsService(analyticsRepository);

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!["admin", "bus_owner"].includes(userData.data?.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    let ownerId = searchParams.get("ownerId");
    const busId = searchParams.get("busId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // If bus_owner, automatically use their ownerId
    if (userData.data?.role === "bus_owner" && !ownerId) {
      const { data: busOwner } = await supabase
        .from("bus_owners")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (busOwner) {
        ownerId = busOwner.id;
      }
    }

    if (busId && startDate) {
      const date = new Date(startDate);
      const revenue = await analyticsService.getDailyRevenue(busId, date);
      return NextResponse.json({ revenue });
    }

    if (ownerId && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Limit date range to 1 year maximum
      const maxDateRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
      if (end.getTime() - start.getTime() > maxDateRange) {
        return NextResponse.json(
          { error: "Date range cannot exceed 1 year" },
          { status: 400 }
        );
      }
      
      const revenue = await analyticsService.getOwnerRevenue(ownerId, start, end);
      return NextResponse.json({ revenue });
    }

    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error fetching revenue:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch revenue" },
      { status: 500 }
    );
  }
}

