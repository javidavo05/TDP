import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { POSTerminalRepository } from "@/infrastructure/db/supabase/POSTerminalRepository";
import { POSTerminalService } from "@/services/admin/POSTerminalService";
import { POSTerminal } from "@/domain/entities";

export const dynamic = 'force-dynamic';

const terminalRepository = new POSTerminalRepository();
const terminalService = new POSTerminalService(terminalRepository);

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

  return { user, role: userData?.role };
}

export async function GET(request: NextRequest) {
  try {
    const { user, role } = await checkAuth();

    if (role !== "admin" && role !== "pos_agent") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If pos_agent, only return their assigned terminal
    if (role === "pos_agent") {
      const terminal = await terminalService.getTerminalByAssignedUser(user.id);
      if (!terminal) {
        return NextResponse.json({ terminals: [] });
      }
      return NextResponse.json({ terminals: [terminal] });
    }

    // Admin sees all terminals
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    const result = await terminalService.listTerminals({ page, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching POS terminals:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch terminals" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, role } = await checkAuth();

    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { terminalIdentifier, physicalLocation, locationCode, assignedUserId } = body;

    if (!terminalIdentifier || !physicalLocation) {
      return NextResponse.json(
        { error: "terminalIdentifier and physicalLocation are required" },
        { status: 400 }
      );
    }

    const terminal = await terminalService.createTerminal({
      terminalIdentifier,
      physicalLocation,
      locationCode,
      assignedUserId,
    });

    return NextResponse.json({ terminal }, { status: 201 });
  } catch (error) {
    console.error("Error creating POS terminal:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to create terminal" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

