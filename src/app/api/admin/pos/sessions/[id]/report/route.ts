import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { POSTerminalRepository } from "@/infrastructure/db/supabase/POSTerminalRepository";
import { POSCashSessionRepository } from "@/infrastructure/db/supabase/POSCashSessionRepository";
import { POSTransactionRepository } from "@/infrastructure/db/supabase/POSTransactionRepository";
import { CashCountRepository } from "@/infrastructure/db/supabase/CashCountRepository";
import { CashRegisterService } from "@/services/pos/CashRegisterService";

export const dynamic = 'force-dynamic';

const terminalRepository = new POSTerminalRepository();
const sessionRepository = new POSCashSessionRepository();
const transactionRepository = new POSTransactionRepository();
const cashCountRepository = new CashCountRepository();
const cashRegisterService = new CashRegisterService(
  terminalRepository,
  sessionRepository,
  transactionRepository,
  cashCountRepository
);

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

    // Verify session exists and user has access
    const session = await sessionRepository.findById(params.id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const terminal = await terminalRepository.findById(session.terminalId);
    if (!terminal) {
      return NextResponse.json({ error: "Terminal not found" }, { status: 404 });
    }

    // pos_agent can only see reports from their own terminal
    if (role === "pos_agent" && terminal.assignedUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const report = await cashRegisterService.getSessionReport(params.id);
    return NextResponse.json(report);
  } catch (error) {
    console.error("Error generating session report:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to generate report" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

