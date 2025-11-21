"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CashCountInput } from "./CashCountInput";
import { Lock } from "lucide-react";
import { validateCashCount } from "@/lib/validation/cashCountValidator";

interface CashRegisterOpenProps {
  terminalId: string;
  onOpen: (initialCash: number, breakdown: Array<{ denomination: number; count: number; type: "bill" | "coin" }>) => Promise<void>;
  onCancel?: () => void;
}

export function CashRegisterOpen({ terminalId, onOpen, onCancel }: CashRegisterOpenProps) {
  const [manualTotal, setManualTotal] = useState("");
  const [countedTotal, setCountedTotal] = useState(0);
  const [breakdown, setBreakdown] = useState<Array<{ denomination: number; count: number; type: "bill" | "coin" }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discrepancyNotes, setDiscrepancyNotes] = useState("");

  const validation = manualTotal ? validateCashCount(countedTotal, parseFloat(manualTotal)) : null;
  const canProceed = countedTotal > 0 && (!manualTotal || validation?.isValid || discrepancyNotes.trim().length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (countedTotal <= 0) {
      setError("Debes contar al menos algo de efectivo");
      setLoading(false);
      return;
    }

    const manual = manualTotal ? parseFloat(manualTotal) : countedTotal;
    if (isNaN(manual) || manual < 0) {
      setError("El monto manual debe ser un número válido mayor o igual a 0");
      setLoading(false);
      return;
    }

    // If there's a discrepancy and no notes, require notes
    if (validation && !validation.isValid && !discrepancyNotes.trim()) {
      setError("Debes agregar una nota explicando la discrepancia");
      setLoading(false);
      return;
    }

    try {
      await onOpen(countedTotal, breakdown);
    } catch (err: any) {
      setError(err.message || "Error al abrir la caja");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-6">
      <Card className="w-full max-w-6xl">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-4xl font-bold mb-2">Apertura de Caja</CardTitle>
          <CardDescription className="text-lg">
            Cuenta los billetes y monedas disponibles e ingresa el monto manual para validación
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Cash Count Input */}
            <CashCountInput
              onTotalChange={(total, breakdownData) => {
                setCountedTotal(total);
                setBreakdown(breakdownData);
              }}
              manualTotal={manualTotal ? parseFloat(manualTotal) : undefined}
              showValidation={!!manualTotal}
              disabled={loading}
            />

            {/* Manual Total Input */}
            <div className="space-y-3">
              <Label htmlFor="manualTotal" className="text-xl font-semibold">
                Monto Manual (Opcional - para validación)
              </Label>
              <Input
                id="manualTotal"
                type="number"
                step="0.01"
                min="0"
                value={manualTotal}
                onChange={(e) => setManualTotal(e.target.value)}
                placeholder="Ingresa el monto que contaste manualmente"
                className="h-16 text-2xl text-center font-bold"
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                Ingresa el monto que contaste manualmente para comparar con el conteo por denominaciones
              </p>
            </div>

            {/* Discrepancy Notes */}
            {validation && !validation.isValid && (
              <div className="space-y-3">
                <Label htmlFor="discrepancyNotes" className="text-xl font-semibold">
                  Nota sobre la Discrepancia *
                </Label>
                <Input
                  id="discrepancyNotes"
                  type="text"
                  value={discrepancyNotes}
                  onChange={(e) => setDiscrepancyNotes(e.target.value)}
                  placeholder="Explica la diferencia entre el conteo y el monto manual"
                  className="h-16 text-lg"
                  disabled={loading}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Es obligatorio agregar una nota cuando hay discrepancia
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-destructive/10 p-4 text-base text-destructive border-2 border-destructive/20">
                {error}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button 
                type="submit" 
                className="flex-1 h-16 text-2xl font-bold touch-manipulation active:scale-95 transition-transform" 
                disabled={loading || !canProceed}
                size="lg"
              >
                {loading ? "Abriendo..." : "Abrir Caja"}
              </Button>
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={loading}
                  size="lg"
                  className="h-16 text-xl font-semibold touch-manipulation active:scale-95 transition-transform"
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

