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

    const searchParams = request.nextUrl.searchParams;
    const ownerId = searchParams.get("ownerId");
    const busId = searchParams.get("busId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (busId && startDate) {
      const date = new Date(startDate);
      const revenue = await analyticsService.getDailyRevenue(busId, date);
      return NextResponse.json({ revenue });
    }

    if (ownerId && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
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

