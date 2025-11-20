import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

export async function POST(request: NextRequest) {
  try {
    await checkAdminAuth();

    // TODO: Implement actual test print
    // This would use the ThermalPrinterService to print a test page
    return NextResponse.json({ success: true, message: "Test print sent" });
  } catch (error) {
    console.error("Error in test print:", error);
    const message = (error as Error).message;
    if (message === "Unauthorized" || message.includes("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message || "Failed to send test print" }, { status: 400 });
  }
}

