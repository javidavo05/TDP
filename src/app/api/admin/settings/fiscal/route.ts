import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SettingsRepository } from "@/infrastructure/db/supabase/SettingsRepository";

const settingsRepository = new SettingsRepository();

async function checkAdminAuth() {
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

  if (!["admin", "bus_owner"].includes(userData?.role || "")) {
    throw new Error("Forbidden: Admin access required");
  }

  return user;
}

export async function GET(request: NextRequest) {
  try {
    await checkAdminAuth();

    const settings = await settingsRepository.getSettingsByCategory("fiscal");
    return NextResponse.json({ fiscal: settings });
  } catch (error) {
    console.error("Error fetching fiscal settings:", error);
    const message = (error as Error).message;
    if (message === "Unauthorized" || message.includes("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch fiscal settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await checkAdminAuth();

    const body = await request.json();
    const { printerType, portPath } = body;

    await settingsRepository.updateSettings({
      "fiscal.type": printerType,
      "fiscal.port": portPath,
    });

    return NextResponse.json({ success: true, message: "Fiscal settings updated successfully" });
  } catch (error) {
    console.error("Error updating fiscal settings:", error);
    const message = (error as Error).message;
    if (message === "Unauthorized" || message.includes("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message || "Failed to update fiscal settings" }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await checkAdminAuth();

    const body = await request.json();
    const { printerType, portPath } = body;
    
    // Test connection
    // TODO: Implement actual fiscal printer connection test
    // This would use the FiscalService to test connection
    return NextResponse.json({
      success: true,
      status: {
        online: true,
        paperStatus: "ok",
      },
    });
  } catch (error) {
    console.error("Error in fiscal test:", error);
    const message = (error as Error).message;
    if (message === "Unauthorized" || message.includes("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message || "Failed to test fiscal printer" }, { status: 400 });
  }
}

