import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

async function checkAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin") {
    throw new Error("Forbidden");
  }

  return { user, role: userData?.role };
}

export async function GET() {
  try {
    await checkAuth();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("loyalty_config")
      .select("*")
      .eq("is_active", true)
      .order("min_points", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch loyalty config: ${error.message}`);
    }

    return NextResponse.json({ tiers: data || [] });
  } catch (error: any) {
    console.error("Error fetching loyalty config:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch loyalty config" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await checkAuth();
    const supabase = await createClient();
    const body = await request.json();

    const { tier_name, min_points, benefits, discount_percentage, is_active } = body;

    if (!tier_name || min_points === undefined) {
      return NextResponse.json(
        { error: "tier_name and min_points are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("loyalty_config")
      .upsert(
        {
          tier_name,
          min_points,
          benefits: benefits || {},
          discount_percentage: discount_percentage || 0,
          is_active: is_active !== undefined ? is_active : true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "tier_name",
        }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save loyalty config: ${error.message}`);
    }

    return NextResponse.json({ tier: data });
  } catch (error: any) {
    console.error("Error saving loyalty config:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save loyalty config" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 401 : 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await checkAuth();
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const tierName = searchParams.get("tier_name");

    if (!tierName) {
      return NextResponse.json({ error: "tier_name is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("loyalty_config")
      .update({ is_active: false })
      .eq("tier_name", tierName);

    if (error) {
      throw new Error(`Failed to delete loyalty config: ${error.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting loyalty config:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete loyalty config" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 401 : 500 }
    );
  }
}

