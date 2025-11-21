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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, role } = await checkAuth();

    const body = await request.json();
    const { closureType, actualCash, cashBreakdown, manualTotal, notes, discrepancyNotes } = body;

    if (!closureType || !["X", "Z"].includes(closureType)) {
      return NextResponse.json(
        { error: "closureType must be 'X' or 'Z'" },
        { status: 400 }
      );
    }

    if (actualCash === undefined || actualCash < 0) {
      return NextResponse.json(
        { error: "actualCash is required and must be >= 0" },
        { status: 400 }
      );
    }

    // Verify terminal exists and user has access
    const terminal = await terminalRepository.findById(params.id);
    if (!terminal) {
      return NextResponse.json({ error: "Terminal not found" }, { status: 404 });
    }

    // pos_agent can only close their own terminal
    if (role === "pos_agent" && terminal.assignedUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await cashRegisterService.closeCashRegister(
      params.id,
      user.id,
      closureType,
      parseFloat(actualCash),
      cashBreakdown,
      manualTotal ? parseFloat(manualTotal) : undefined,
      notes,
      discrepancyNotes
    );

    return NextResponse.json({
      terminal: result.terminal,
      session: result.session,
      message: `Cash register closed (${closureType}) successfully`,
    });
  } catch (error) {
    console.error("Error closing cash register:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to close cash register" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

