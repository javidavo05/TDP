"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CASH_DENOMINATIONS, formatDenomination, calculateCashTotal } from "@/lib/constants";
import { validateCashCount } from "@/lib/validation/cashCountValidator";
import { CheckCircle2, AlertCircle, Plus, Minus } from "lucide-react";

interface CashCountInputProps {
  onTotalChange: (total: number, breakdown: Array<{ denomination: number; count: number; type: "bill" | "coin" }>) => void;
  manualTotal?: number;
  showValidation?: boolean;
  disabled?: boolean;
  initialBreakdown?: Array<{ denomination: number; count: number; type: "bill" | "coin" }>;
}

export function CashCountInput({
  onTotalChange,
  manualTotal,
  showValidation = false,
  disabled = false,
  initialBreakdown = [],
}: CashCountInputProps) {
  const [breakdown, setBreakdown] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    [...CASH_DENOMINATIONS.bills, ...CASH_DENOMINATIONS.coins].forEach((denom) => {
      const key = `${denom}`;
      const existing = initialBreakdown.find((b) => b.denomination === denom);
      initial[key] = existing?.count || 0;
    });
    return initial;
  });

  useEffect(() => {
    const breakdownArray = Object.entries(breakdown).map(([denom, count]) => ({
      denomination: parseFloat(denom),
      count,
      type: parseFloat(denom) >= 1 ? ("bill" as const) : ("coin" as const),
    }));
    const total = calculateCashTotal(breakdownArray);
    onTotalChange(total, breakdownArray);
  }, [breakdown, onTotalChange]);

  const updateCount = (denomination: number, delta: number) => {
    const key = `${denomination}`;
    setBreakdown((prev) => {
      const current = prev[key] || 0;
      const newCount = Math.max(0, current + delta);
      return { ...prev, [key]: newCount };
    });
  };

  const setCount = (denomination: number, count: number) => {
    const key = `${denomination}`;
    setBreakdown((prev) => ({
      ...prev,
      [key]: Math.max(0, count),
    }));
  };

  const breakdownArray = Object.entries(breakdown).map(([denom, count]) => ({
    denomination: parseFloat(denom),
    count,
    type: parseFloat(denom) >= 1 ? ("bill" as const) : ("coin" as const),
  }));

  const total = calculateCashTotal(breakdownArray);
  const validation = manualTotal !== undefined ? validateCashCount(total, manualTotal) : null;

  const renderDenominationInput = (denomination: number, isBill: boolean) => {
    const key = `${denomination}`;
    const count = breakdown[key] || 0;
    const subtotal = denomination * count;

    return (
      <div key={key} className="flex items-center gap-2 p-2 border rounded-lg">
        <div className="flex-1">
          <Label className="text-sm font-medium">{formatDenomination(denomination)}</Label>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => updateCount(denomination, -1)}
            disabled={disabled || count === 0}
            className="h-8 w-8 p-0"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            min="0"
            value={count}
            onChange={(e) => setCount(denomination, parseInt(e.target.value) || 0)}
            disabled={disabled}
            className="w-20 text-center"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => updateCount(denomination, 1)}
            disabled={disabled}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="w-24 text-right">
          <div className="text-sm font-medium">${subtotal.toFixed(2)}</div>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-2">
      <CardHeader className="pb-4">
        <CardTitle className="text-3xl font-bold">Conteo de Efectivo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bills Section */}
        <div>
          <Label className="text-2xl font-bold mb-4 block">Billetes</Label>
          <div className="space-y-4">
            {CASH_DENOMINATIONS.bills.map((denom) => renderDenominationInput(denom, true))}
          </div>
        </div>

        {/* Coins Section */}
        <div>
          <Label className="text-2xl font-bold mb-4 block">Monedas</Label>
          <div className="space-y-4">
            {CASH_DENOMINATIONS.coins.map((denom) => renderDenominationInput(denom, false))}
          </div>
        </div>

        {/* Total Section */}
        <div className="pt-6 border-t-2 border-primary/20 space-y-4">
          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl">
            <span className="text-2xl font-bold">Total Calculado:</span>
            <span className="text-4xl font-bold text-primary">${total.toFixed(2)}</span>
          </div>

          {showValidation && manualTotal !== undefined && validation && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${
                validation.isValid
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              }`}
            >
              {validation.isValid ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              )}
              <div className="flex-1">
                <div className={`text-sm font-medium ${validation.isValid ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"}`}>
                  {validation.message}
                </div>
                {!validation.isValid && (
                  <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Diferencia: ${validation.difference.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

