"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CashCountInput } from "./CashCountInput";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { validateCashCountForClosing } from "@/lib/validation/cashCountValidator";

interface CashRegisterCloseProps {
  session: {
    id: string;
    initialCash: number;
    totalSales: number;
    totalCashSales: number;
    totalCardSales: number;
    totalTickets: number;
  };
  onClose: (
    closureType: "X" | "Z",
    actualCash: number,
    breakdown: Array<{ denomination: number; count: number; type: "bill" | "coin" }>,
    notes?: string
  ) => Promise<void>;
  onCancel?: () => void;
}

export function CashRegisterClose({
  session,
  onClose,
  onCancel,
}: CashRegisterCloseProps) {
  const [closureType, setClosureType] = useState<"X" | "Z">("X");
  const [countedTotal, setCountedTotal] = useState(0);
  const [breakdown, setBreakdown] = useState<Array<{ denomination: number; count: number; type: "bill" | "coin" }>>([]);
  const [manualTotal, setManualTotal] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discrepancyNotes, setDiscrepancyNotes] = useState("");

  const expectedCash = session.initialCash + session.totalCashSales;
  
  const validation = manualTotal
    ? validateCashCountForClosing(
        countedTotal,
        parseFloat(manualTotal),
        expectedCash
      )
    : null;

  const canProceed =
    countedTotal > 0 &&
    (!manualTotal || validation?.overallValid || discrepancyNotes.trim().length > 0);

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
    if (manualTotal && (isNaN(manual) || manual < 0)) {
      setError("El monto manual debe ser un número válido mayor o igual a 0");
      setLoading(false);
      return;
    }

    // If there's a discrepancy and no notes, require notes
    if (validation && !validation.overallValid && !discrepancyNotes.trim()) {
      setError("Debes agregar una nota explicando la discrepancia");
      setLoading(false);
      return;
    }

    try {
      await onClose(closureType, countedTotal, breakdown, notes || discrepancyNotes || undefined);
    } catch (err: any) {
      setError(err.message || "Error al cerrar la caja");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-6">
      <Card className="w-full max-w-6xl">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-4xl font-bold mb-2">Cierre de Caja</CardTitle>
          <CardDescription className="text-lg">
            Cuenta el efectivo y selecciona el tipo de cierre
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Resumen de Sesión */}
            <div className="rounded-xl border-2 border-border p-6 space-y-4 bg-muted/30">
              <h3 className="text-2xl font-bold mb-4">Resumen de Sesión</h3>
              <div className="grid grid-cols-2 gap-6 text-lg">
                <div className="p-4 bg-card rounded-lg border">
                  <div className="text-muted-foreground text-base mb-2">Efectivo Inicial</div>
                  <div className="font-bold text-2xl">${session.initialCash.toFixed(2)}</div>
                </div>
                <div className="p-4 bg-card rounded-lg border">
                  <div className="text-muted-foreground text-base mb-2">Ventas en Efectivo</div>
                  <div className="font-bold text-2xl">${session.totalCashSales.toFixed(2)}</div>
                </div>
                <div className="p-4 bg-card rounded-lg border">
                  <div className="text-muted-foreground text-base mb-2">Ventas con Tarjeta</div>
                  <div className="font-bold text-2xl">${session.totalCardSales.toFixed(2)}</div>
                </div>
                <div className="p-4 bg-card rounded-lg border">
                  <div className="text-muted-foreground text-base mb-2">Total de Tickets</div>
                  <div className="font-bold text-2xl">{session.totalTickets}</div>
                </div>
                <div className="col-span-2 pt-4 border-t-2 border-primary/20">
                  <div className="text-muted-foreground text-xl mb-2">Efectivo Esperado</div>
                  <div className="font-bold text-4xl text-primary">${expectedCash.toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Tipo de Cierre */}
            <div className="space-y-4">
              <Label className="text-2xl font-bold mb-4 block">Tipo de Cierre</Label>
              <RadioGroup value={closureType} onValueChange={(v) => setClosureType(v as "X" | "Z")}>
                <div className="flex items-center space-x-4 p-6 border-2 border-border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer touch-manipulation">
                  <RadioGroupItem value="X" id="closure-x" className="h-6 w-6" />
                  <Label htmlFor="closure-x" className="flex-1 cursor-pointer">
                    <div className="text-xl font-bold mb-1">Cierre X (Parcial)</div>
                    <div className="text-base text-muted-foreground">
                      Reporte diario sin resetear contadores
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-4 p-6 border-2 border-border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer touch-manipulation">
                  <RadioGroupItem value="Z" id="closure-z" className="h-6 w-6" />
                  <Label htmlFor="closure-z" className="flex-1 cursor-pointer">
                    <div className="text-xl font-bold mb-1">Cierre Z (Total)</div>
                    <div className="text-base text-muted-foreground">
                      Cierre total que resetea contadores
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

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
                Monto Manual Contado (Opcional - para validación)
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

            {/* Validation Results */}
            {validation && (
              <div className="space-y-4">
                <div className="text-2xl font-bold mb-4">Validación de Totales</div>
                
                <div className={`p-5 rounded-xl border-2 ${
                  validation.countedVsManual.isValid
                    ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                    : "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
                }`}>
                  <div className="flex items-center gap-3">
                    {validation.countedVsManual.isValid ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
                    )}
                    <span className="text-lg font-semibold">
                      Contado vs Manual: {validation.countedVsManual.message}
                    </span>
                  </div>
                </div>

                <div className={`p-5 rounded-xl border-2 ${
                  validation.countedVsExpected.isValid
                    ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                    : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
                }`}>
                  <div className="flex items-center gap-3">
                    {validation.countedVsExpected.isValid ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                    )}
                    <span className="text-lg font-semibold">
                      Contado vs Esperado: {validation.countedVsExpected.message}
                    </span>
                  </div>
                </div>

                {manualTotal && (
                  <div className={`p-5 rounded-xl border-2 ${
                    validation.manualVsExpected.isValid
                      ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                      : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
                  }`}>
                    <div className="flex items-center gap-3">
                      {validation.manualVsExpected.isValid ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                      )}
                      <span className="text-lg font-semibold">
                        Manual vs Esperado: {validation.manualVsExpected.message}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Discrepancy Notes */}
            {validation && !validation.overallValid && (
              <div className="space-y-3">
                <Label htmlFor="discrepancyNotes" className="text-xl font-semibold">
                  Nota sobre la Discrepancia *
                </Label>
                <Textarea
                  id="discrepancyNotes"
                  value={discrepancyNotes}
                  onChange={(e) => setDiscrepancyNotes(e.target.value)}
                  placeholder="Explica la diferencia entre los totales"
                  className="h-24 text-lg"
                  disabled={loading}
                  required
                  rows={3}
                />
                <p className="text-sm text-muted-foreground">
                  Es obligatorio agregar una nota cuando hay discrepancias
                </p>
              </div>
            )}

            {/* Notas */}
            <div className="space-y-3">
              <Label htmlFor="notes" className="text-xl font-semibold">Notas (Opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones sobre el cierre..."
                className="h-24 text-lg"
                rows={3}
              />
            </div>

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
                {loading ? "Cerrando..." : `Cerrar Caja (${closureType})`}
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

