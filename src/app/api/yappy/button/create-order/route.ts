import { NextRequest, NextResponse } from "next/server";
import { getYappyButtonPaymentService } from "@/services/yappy/YappyButtonPaymentService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, amount, description, ipnUrl, aliasYappy } = body;

    if (!orderId || !amount || !description || !ipnUrl) {
      return NextResponse.json(
        { error: "orderId, amount, description e ipnUrl son requeridos" },
        { status: 400 }
      );
    }

    const service = getYappyButtonPaymentService();
    const result = await service.createOrder({
      orderId,
      amount,
      description,
      ipnUrl,
      aliasYappy, // Opcional, solo para pruebas
    });

    return NextResponse.json({
      orderId: result.orderId,
      status: result.status,
      message: "Orden creada exitosamente",
    });
  } catch (error) {
    console.error("Error creating Yappy order:", error);
    return NextResponse.json(
      {
        error: (error as Error).message || "Error al crear orden de Yappy",
      },
      { status: 500 }
    );
  }
}

