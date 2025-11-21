import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { POSCashSessionRepository } from "@/infrastructure/db/supabase/POSCashSessionRepository";

export const dynamic = 'force-dynamic';

const sessionRepository = new POSCashSessionRepository();

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

export async function GET(request: NextRequest) {
  try {
    const { user, role } = await checkAuth();
    const searchParams = request.nextUrl.searchParams;
    const terminalId = searchParams.get("terminalId");

    if (!terminalId) {
      return NextResponse.json(
        { error: "terminalId is required" },
        { status: 400 }
      );
    }

    const session = await sessionRepository.findActiveByTerminal(terminalId);
    if (!session) {
      return NextResponse.json({ session: null });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Error fetching active session:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch session" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

