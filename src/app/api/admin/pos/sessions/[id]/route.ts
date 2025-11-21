import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { POSCashSessionRepository } from "@/infrastructure/db/supabase/POSCashSessionRepository";
import { POSTerminalRepository } from "@/infrastructure/db/supabase/POSTerminalRepository";

export const dynamic = 'force-dynamic';

const sessionRepository = new POSCashSessionRepository();
const terminalRepository = new POSTerminalRepository();

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

  if (userData?.role !== "admin" && userData?.role !== "pos_agent") {
    throw new Error("Forbidden");
  }

  return { user, role: userData?.role };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, role } = await checkAuth();

    const session = await sessionRepository.findById(params.id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Verify user has access to this terminal
    const terminal = await terminalRepository.findById(session.terminalId);
    if (!terminal) {
      return NextResponse.json({ error: "Terminal not found" }, { status: 404 });
    }

    // pos_agent can only see sessions from their own terminal
    if (role === "pos_agent" && terminal.assignedUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Error fetching cash session:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch session" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

