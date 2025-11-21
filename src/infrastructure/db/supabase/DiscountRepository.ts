import { IDiscountRepository, DiscountCoupon } from "@/domain/repositories/IDiscountRepository";
import { createClient } from "@/lib/supabase/server";

export class DiscountRepository implements IDiscountRepository {
  async findByCode(code: string): Promise<DiscountCoupon | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("discount_coupons")
      .select("*")
      .eq("code", code.toUpperCase())
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async validateCoupon(code: string, purchaseAmount: number): Promise<{ valid: boolean; coupon: DiscountCoupon | null; error?: string }> {
    const coupon = await this.findByCode(code);
    
    if (!coupon) {
      return { valid: false, coupon: null, error: "Cupón no encontrado" };
    }

    if (!coupon.isActive) {
      return { valid: false, coupon: null, error: "Cupón no está activo" };
    }

    const now = new Date();
    if (coupon.validFrom > now) {
      return { valid: false, coupon: null, error: "Cupón aún no es válido" };
    }

    if (coupon.validUntil && coupon.validUntil < now) {
      return { valid: false, coupon: null, error: "Cupón ha expirado" };
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, coupon: null, error: "Cupón ha alcanzado su límite de uso" };
    }

    if (purchaseAmount < coupon.minPurchaseAmount) {
      return { valid: false, coupon: null, error: `Monto mínimo de compra: $${coupon.minPurchaseAmount.toFixed(2)}` };
    }

    return { valid: true, coupon };
  }

  async incrementUsage(code: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.rpc("increment_coupon_usage", { coupon_code: code.toUpperCase() });
    
    if (error) {
      // Fallback: manual update if RPC doesn't exist
      const coupon = await this.findByCode(code);
      if (coupon) {
        await supabase
          .from("discount_coupons")
          .update({ usage_count: coupon.usageCount + 1 })
          .eq("code", code.toUpperCase());
      }
    }
  }

  private mapToEntity(data: any): DiscountCoupon {
    return {
      id: data.id,
      code: data.code,
      description: data.description,
      discountType: data.discount_type,
      discountValue: parseFloat(data.discount_value),
      minPurchaseAmount: parseFloat(data.min_purchase_amount || "0"),
      maxDiscountAmount: data.max_discount_amount ? parseFloat(data.max_discount_amount) : null,
      usageLimit: data.usage_limit,
      usageCount: data.usage_count || 0,
      validFrom: new Date(data.valid_from),
      validUntil: data.valid_until ? new Date(data.valid_until) : null,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}

