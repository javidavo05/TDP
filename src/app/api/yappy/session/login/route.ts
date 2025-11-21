import { NextRequest, NextResponse } from "next/server";
import { getYappySessionService } from "@/services/yappy/YappySessionService";

export async function POST(request: NextRequest) {
  try {
    const sessionService = getYappySessionService();
    const session = await sessionService.openSession();

    return NextResponse.json({
      session,
      message: "Sesión abierta correctamente",
    });
  } catch (error) {
    console.error("Error opening Yappy session:", error);
    return NextResponse.json(
      {
        error: (error as Error).message || "Error al abrir sesión de Yappy",
      },
      { status: 500 }
    );
  }
}

