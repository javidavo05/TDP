import { NextRequest, NextResponse } from "next/server";
import { getYappyButtonPaymentService } from "@/services/yappy/YappyButtonPaymentService";

export async function POST(request: NextRequest) {
  try {
    const service = getYappyButtonPaymentService();
    const validation = await service.validateMerchant();

    return NextResponse.json({
      token: validation.token,
      epochTime: validation.epochTime,
      message: "Merchant validated successfully",
    });
  } catch (error) {
    console.error("Error validating Yappy merchant:", error);
    return NextResponse.json(
      {
        error: (error as Error).message || "Error al validar comercio de Yappy",
      },
      { status: 500 }
    );
  }
}

