"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, CheckCircle2, AlertCircle } from "lucide-react";

interface PaymentAmountInputProps {
  totalAmount: number; // This should be the total including ITBMS
  onAmountReceived: (amount: number, change: number) => void;
  paymentMethod: "cash" | "card";
  disabled?: boolean;
}

export function PaymentAmountInput({
  totalAmount,
  onAmountReceived,
  paymentMethod,
  disabled = false,
}: PaymentAmountInputProps) {
  const [receivedAmount, setReceivedAmount] = useState("");
  const [change, setChange] = useState(0);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (paymentMethod === "card") {
      // For card payments, no change needed
      setReceivedAmount(totalAmount.toFixed(2));
      setChange(0);
      setIsValid(true);
    } else {
      // For cash, reset when total changes
      setReceivedAmount("");
      setChange(0);
      setIsValid(false);
    }
  }, [totalAmount, paymentMethod]);

  const handleAmountChange = (value: string) => {
    setReceivedAmount(value);
    const amount = parseFloat(value);
    if (!isNaN(amount)) {
      const calculatedChange = Math.max(0, amount - totalAmount);
      setChange(calculatedChange);
      setIsValid(amount >= totalAmount);
    } else {
      setChange(0);
      setIsValid(false);
    }
  };

  const handleConfirm = () => {
    const amount = parseFloat(receivedAmount);
    if (isValid && amount >= totalAmount) {
      onAmountReceived(amount, change);
    }
  };

  const quickAmounts = [
    totalAmount,
    totalAmount + 5,
    totalAmount + 10,
    totalAmount + 20,
    Math.ceil(totalAmount / 10) * 10, // Round up to nearest 10
  ];

  if (paymentMethod === "card") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <div className="text-sm text-muted-foreground">Pago con Tarjeta</div>
            <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
            <Button
              onClick={handleConfirm}
              disabled={disabled}
              className="w-full mt-4"
              size="lg"
            >
              Procesar Pago con Tarjeta
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div>
          <Label htmlFor="receivedAmount">Monto Recibido (USD)</Label>
          <div className="relative mt-1">
            <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="receivedAmount"
              type="number"
              step="0.01"
              min={totalAmount}
              value={receivedAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder={totalAmount.toFixed(2)}
              className="pl-10 text-2xl font-bold h-16"
              disabled={disabled}
              autoFocus
            />
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {quickAmounts.map((amount, index) => (
            <Button
              key={index}
              variant="outline"
              onClick={() => handleAmountChange(amount.toFixed(2))}
              disabled={disabled}
              className="text-sm"
            >
              ${amount.toFixed(2)}
            </Button>
          ))}
        </div>

        {/* Change Display */}
        {receivedAmount && (
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total a Pagar:</span>
              <span className="font-medium">${totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Recibido:</span>
              <span className="font-medium">${parseFloat(receivedAmount || "0").toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="font-semibold">Vuelto:</span>
              <span
                className={`text-xl font-bold ${
                  change > 0 ? "text-green-600" : "text-muted-foreground"
                }`}
              >
                ${change.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Validation Status */}
        {receivedAmount && (
          <div className="flex items-center gap-2">
            {isValid ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-600">Monto suficiente</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-destructive" />
                <span className="text-sm text-destructive">
                  Monto insuficiente. Faltan ${(totalAmount - parseFloat(receivedAmount || "0")).toFixed(2)}
                </span>
              </>
            )}
          </div>
        )}

        {/* Confirm Button */}
        <Button
          onClick={handleConfirm}
          disabled={!isValid || disabled}
          className="w-full"
          size="lg"
        >
          Confirmar Pago
        </Button>
      </CardContent>
    </Card>
  );
}

