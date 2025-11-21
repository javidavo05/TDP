import { NextRequest, NextResponse } from "next/server";
import { YappyComercialProvider } from "@/infrastructure/payments/yappy/YappyComercialProvider";

export async function GET(request: NextRequest) {
  try {
    const provider = new YappyComercialProvider();
    const methods = await provider.getCollectionMethods();

    return NextResponse.json({
      methods,
    });
  } catch (error) {
    console.error("Error fetching Yappy collection methods:", error);
    return NextResponse.json(
      {
        error: (error as Error).message || "Error al consultar métodos de cobro",
      },
      { status: 500 }
    );
  }
}

