import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SettingsService } from "@/services/admin/SettingsService";
import { SettingsRepository } from "@/infrastructure/db/supabase/SettingsRepository";

export const dynamic = 'force-dynamic';

const settingsRepository = new SettingsRepository();
const settingsService = new SettingsService(settingsRepository);

// Helper to check admin auth
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

  if (userData?.role !== "admin" && userData?.role !== "owner") {
    throw new Error("Forbidden: Admin access required");
  }

  return user;
}

export async function GET(request: NextRequest) {
  try {
    await checkAdminAuth();

    const category = request.nextUrl.searchParams.get("category") as "payment" | "email" | "general" | "pwa_icons" | null;

    if (category) {
      let data;
      switch (category) {
        case "payment":
          data = await settingsService.getPaymentGateways();
          break;
        case "email":
          data = await settingsService.getEmailConfig();
          break;
        case "general":
          data = await settingsService.getGeneralConfig();
          break;
        case "pwa_icons":
          data = await settingsService.getPWAIconsConfig();
          break;
        default:
          return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
      return NextResponse.json({ [category]: data });
    }

    // Return all settings
    const allSettings = await settingsService.getAllSettings();
    return NextResponse.json(allSettings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    const message = (error as Error).message;
    if (message === "Unauthorized" || message.includes("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await checkAdminAuth();

    const body = await request.json();
    const { category, data: configData } = body;

    if (!category || !configData) {
      return NextResponse.json({ error: "Category and data are required" }, { status: 400 });
    }

    switch (category) {
      case "payment":
        const { gateway, config } = configData;
        if (!gateway || !config) {
          return NextResponse.json({ error: "Gateway and config are required" }, { status: 400 });
        }
        await settingsService.updatePaymentGateway(gateway, config);
        break;
      case "email":
        await settingsService.updateEmailConfig(configData);
        break;
      case "general":
        await settingsService.updateGeneralConfig(configData);
        break;
      case "pwa_icons":
        await settingsService.updatePWAIconsConfig(configData);
        break;
      default:
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Settings updated successfully" });
  } catch (error) {
    console.error("Error updating settings:", error);
    const message = (error as Error).message;
    if (message === "Unauthorized" || message.includes("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message || "Failed to update settings" }, { status: 400 });
  }
}

