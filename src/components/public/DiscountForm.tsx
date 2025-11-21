"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface DiscountCoupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxDiscountAmount: number | null;
}

interface DiscountFormProps {
  subtotal: number;
  onDiscountChange: (discount: {
    couponDiscount: number;
    seniorDiscount: number;
    totalDiscount: number;
    coupon?: DiscountCoupon;
    isSenior: boolean;
    couponCode?: string;
  }) => void;
  seniorDiscountPercentage?: number; // Configurable senior discount (e.g., 0.15 for 15%)
}

export function DiscountForm({ 
  subtotal, 
  onDiscountChange,
  seniorDiscountPercentage = 0.15 // Default 15% for seniors
}: DiscountFormProps) {
  const [couponCode, setCouponCode] = useState("");
  const [isSenior, setIsSenior] = useState(false);
  const [validating, setValidating] = useState(false);
  const [coupon, setCoupon] = useState<DiscountCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const calculateDiscounts = (appliedCoupon: DiscountCoupon | null, senior: boolean) => {
    let couponDiscount = 0;
    let seniorDiscount = 0;

    // Calculate coupon discount
    if (appliedCoupon) {
      if (appliedCoupon.discountType === "percentage") {
        couponDiscount = subtotal * (appliedCoupon.discountValue / 100);
        if (appliedCoupon.maxDiscountAmount) {
          couponDiscount = Math.min(couponDiscount, appliedCoupon.maxDiscountAmount);
        }
      } else {
        couponDiscount = Math.min(appliedCoupon.discountValue, subtotal);
      }
    }

    // Calculate senior discount (applied to subtotal after coupon)
    if (senior) {
      const subtotalAfterCoupon = subtotal - couponDiscount;
      seniorDiscount = subtotalAfterCoupon * seniorDiscountPercentage;
    }

    const totalDiscount = couponDiscount + seniorDiscount;

    onDiscountChange({
      couponDiscount,
      seniorDiscount,
      totalDiscount,
      coupon: appliedCoupon || undefined,
      isSenior: senior,
      couponCode: appliedCoupon?.code,
    });
  };

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Ingresa un código de cupón");
      return;
    }

    setValidating(true);
    setCouponError(null);

    try {
      const response = await fetch("/api/public/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim(),
          purchaseAmount: subtotal,
        }),
      });

      const data = await response.json();

      if (data.valid && data.coupon) {
        setCoupon(data.coupon);
        setCouponError(null);
        calculateDiscounts(data.coupon, isSenior);
      } else {
        setCoupon(null);
        setCouponError(data.error || "Cupón inválido");
        calculateDiscounts(null, isSenior);
      }
    } catch (error) {
      console.error("Error validating coupon:", error);
      setCouponError("Error al validar el cupón");
      setCoupon(null);
      calculateDiscounts(null, isSenior);
    } finally {
      setValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setCoupon(null);
    setCouponError(null);
    calculateDiscounts(null, isSenior);
  };

  const handleSeniorChange = (checked: boolean) => {
    setIsSenior(checked);
    calculateDiscounts(coupon, checked);
  };

  return (
    <div className="bg-card p-6 rounded-lg shadow-md space-y-4">
      <h2 className="text-xl font-semibold mb-4">Descuentos</h2>

      {/* Coupon Code Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Código de Cupón</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder="INGRESA TU CÓDIGO"
            className="flex-1 px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={validating || !!coupon}
          />
          {coupon ? (
            <button
              type="button"
              onClick={handleRemoveCoupon}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90"
            >
              <XCircle className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleValidateCoupon}
              disabled={validating || !couponCode.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {validating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Aplicar"
              )}
            </button>
          )}
        </div>
        {couponError && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <XCircle className="w-4 h-4" />
            {couponError}
          </p>
        )}
        {coupon && (
          <p className="text-sm text-success flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            Cupón aplicado: {coupon.code} - {coupon.discountType === "percentage" 
              ? `${coupon.discountValue}%` 
              : `$${coupon.discountValue.toFixed(2)}`}
          </p>
        )}
      </div>

      {/* Senior Discount Checkbox */}
      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
        <input
          type="checkbox"
          id="senior-discount"
          checked={isSenior}
          onChange={(e) => handleSeniorChange(e.target.checked)}
          className="w-4 h-4 rounded border-input"
        />
        <label htmlFor="senior-discount" className="text-sm font-medium cursor-pointer flex-1">
          Soy tercera edad (descuento del {Math.round(seniorDiscountPercentage * 100)}%)
        </label>
      </div>
    </div>
  );
}

