import { NextRequest, NextResponse } from "next/server";
import { DiscountRepository } from "@/infrastructure/db/supabase/DiscountRepository";

export const dynamic = 'force-dynamic';

const discountRepository = new DiscountRepository();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, purchaseAmount } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Código de cupón es requerido" },
        { status: 400 }
      );
    }

    if (purchaseAmount === undefined || purchaseAmount < 0) {
      return NextResponse.json(
        { error: "Monto de compra es requerido" },
        { status: 400 }
      );
    }

    const validation = await discountRepository.validateCoupon(code, purchaseAmount);

    if (!validation.valid) {
      return NextResponse.json(
        { 
          valid: false,
          error: validation.error || "Cupón inválido"
        },
        { status: 200 } // Return 200 with valid: false for client-side handling
      );
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: validation.coupon!.id,
        code: validation.coupon!.code,
        discountType: validation.coupon!.discountType,
        discountValue: validation.coupon!.discountValue,
        maxDiscountAmount: validation.coupon!.maxDiscountAmount,
      },
    });
  } catch (error) {
    console.error("Error validating discount coupon:", error);
    return NextResponse.json(
      { error: "Error al validar el cupón" },
      { status: 500 }
    );
  }
}

