export interface DiscountCoupon {
  id: string;
  code: string;
  description: string | null;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minPurchaseAmount: number;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  usageCount: number;
  validFrom: Date;
  validUntil: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDiscountRepository {
  findByCode(code: string): Promise<DiscountCoupon | null>;
  validateCoupon(code: string, purchaseAmount: number): Promise<{ valid: boolean; coupon: DiscountCoupon | null; error?: string }>;
  incrementUsage(code: string): Promise<void>;
}

