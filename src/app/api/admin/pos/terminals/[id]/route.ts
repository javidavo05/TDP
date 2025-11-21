import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { POSTerminalRepository } from "@/infrastructure/db/supabase/POSTerminalRepository";
import { POSTerminalService } from "@/services/admin/POSTerminalService";

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, role } = await checkAuth();

    if (role !== "admin" && role !== "pos_agent") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const terminal = await terminalService.getTerminalById(params.id);
    if (!terminal) {
      return NextResponse.json({ error: "Terminal not found" }, { status: 404 });
    }

    // pos_agent can only see their own terminal
    if (role === "pos_agent" && terminal.assignedUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ terminal });
  } catch (error) {
    console.error("Error fetching POS terminal:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch terminal" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, role } = await checkAuth();

    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const terminal = await terminalService.getTerminalById(params.id);
    if (!terminal) {
      return NextResponse.json({ error: "Terminal not found" }, { status: 404 });
    }

    const body = await request.json();
    const { physicalLocation, locationCode, assignedUserId, isActive } = body;

    if (physicalLocation !== undefined) terminal.physicalLocation = physicalLocation;
    if (locationCode !== undefined) terminal.locationCode = locationCode;
    if (assignedUserId !== undefined) terminal.assignedUserId = assignedUserId;
    if (isActive !== undefined) terminal.isActive = isActive;

    const updated = await terminalService.updateTerminal(terminal);
    return NextResponse.json({ terminal: updated });
  } catch (error) {
    console.error("Error updating POS terminal:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to update terminal" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { role } = await checkAuth();

    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    await terminalService.deleteTerminal(params.id);
    return NextResponse.json({ message: "Terminal deleted successfully" });
  } catch (error) {
    console.error("Error deleting POS terminal:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to delete terminal" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

