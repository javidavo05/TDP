import { NextRequest, NextResponse } from "next/server";
import { getYappySessionService } from "@/services/yappy/YappySessionService";

export async function GET(request: NextRequest) {
  try {
    const sessionService = getYappySessionService();
    await sessionService.closeSession();

    return NextResponse.json({
      message: "Sesión cerrada correctamente",
    });
  } catch (error) {
    console.error("Error closing Yappy session:", error);
    return NextResponse.json(
      {
        error: (error as Error).message || "Error al cerrar sesión de Yappy",
      },
      { status: 500 }
    );
  }
}

