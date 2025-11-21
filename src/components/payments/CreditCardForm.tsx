"use client";

import { useState, useEffect } from "react";
import { Loader2, CreditCard, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  detectCardType,
  formatCardNumber,
  validateCardNumber,
  validateExpiryDate,
  validateCVV,
  getCardTypeName,
  type CardType,
} from "@/lib/card-detector";

interface CreditCardFormProps {
  amount: number;
  description: string;
  ticketId?: string;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export function CreditCardForm({
  amount,
  description,
  ticketId,
  onSuccess,
  onError,
  disabled = false,
  className = "",
}: CreditCardFormProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [cardType, setCardType] = useState<CardType>("unknown");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Detectar tipo de tarjeta cuando cambia el número
  useEffect(() => {
    const cleaned = cardNumber.replace(/\s+/g, "").replace(/\D/g, "");
    if (cleaned.length >= 4) {
      setCardType(detectCardType(cardNumber));
    } else {
      setCardType("unknown");
    }
  }, [cardNumber]);

  // Formatear número de tarjeta automáticamente
  const handleCardNumberChange = (value: string) => {
    const formatted = formatCardNumber(value);
    setCardNumber(formatted);
    // Limpiar error cuando el usuario empieza a escribir
    if (errors.cardNumber) {
      setErrors((prev) => ({ ...prev, cardNumber: "" }));
    }
  };

  // Formatear fecha de expiración (MM/YY)
  const handleExpiryChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    let formatted = cleaned;

    if (cleaned.length >= 2) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }

    setExpiry(formatted);
    if (errors.expiry) {
      setErrors((prev) => ({ ...prev, expiry: "" }));
    }
  };

  // Validar CVV
  const handleCVVChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const maxLength = cardType === "amex" ? 4 : 3;
    setCvv(cleaned.slice(0, maxLength));
    if (errors.cvv) {
      setErrors((prev) => ({ ...prev, cvv: "" }));
    }
  };

  // Validar formulario
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validar número de tarjeta
    if (!cardNumber || cardNumber.replace(/\s/g, "").length < 13) {
      newErrors.cardNumber = "Número de tarjeta requerido";
    } else if (!validateCardNumber(cardNumber)) {
      newErrors.cardNumber = "Número de tarjeta inválido";
    }

    // Validar fecha de expiración
    if (!expiry) {
      newErrors.expiry = "Fecha de expiración requerida";
    } else if (!validateExpiryDate(expiry)) {
      newErrors.expiry = "Fecha de expiración inválida o vencida";
    }

    // Validar CVV
    if (!cvv) {
      newErrors.cvv = "CVV requerido";
    } else if (!validateCVV(cvv, cardType)) {
      newErrors.cvv = cardType === "amex" ? "CVV debe tener 4 dígitos" : "CVV debe tener 3 dígitos";
    }

    // Validar nombre del titular
    if (!cardholderName || cardholderName.trim().length < 3) {
      newErrors.cardholderName = "Nombre del titular requerido (mínimo 3 caracteres)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Procesar pago
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ticketId) {
      if (onError) {
        onError("Ticket ID es requerido para procesar el pago");
      }
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Extraer mes y año de la fecha de expiración
      const [month, year] = expiry.split("/");
      const fullYear = `20${year}`;

      // Enviar datos al backend
      const response = await fetch("/api/public/payments/paguelofacil/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          cardNumber: cardNumber.replace(/\s/g, ""),
          expiryMonth: parseInt(month, 10),
          expiryYear: parseInt(fullYear, 10),
          cvv,
          cardholderName: cardholderName.trim(),
          amount,
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al procesar el pago");
      }

      if (data.status === "completed" || data.status === "approved") {
        if (onSuccess) {
          onSuccess(data.transactionId || data.id);
        }
      } else {
        throw new Error(data.message || "El pago no fue aprobado");
      }
    } catch (error) {
      const errorMessage = (error as Error).message || "Error al procesar el pago";
      console.error("Credit card payment error:", error);

      if (onError) {
        onError(errorMessage);
      } else {
        alert(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Obtener icono de tarjeta
  const getCardIcon = () => {
    switch (cardType) {
      case "visa":
        return (
          <div className="flex items-center gap-2">
            <div className="w-10 h-6 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">
              VISA
            </div>
          </div>
        );
      case "mastercard":
        return (
          <div className="flex items-center gap-2">
            <div className="w-10 h-6 bg-red-500 rounded flex items-center justify-center text-white font-bold text-xs">
              MC
            </div>
          </div>
        );
      case "amex":
        return (
          <div className="flex items-center gap-2">
            <div className="w-10 h-6 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-xs">
              AMEX
            </div>
          </div>
        );
      case "discover":
        return (
          <div className="flex items-center gap-2">
            <div className="w-10 h-6 bg-orange-500 rounded flex items-center justify-center text-white font-bold text-xs">
              DISC
            </div>
          </div>
        );
      default:
        return <CreditCard className="w-6 h-6 text-muted-foreground" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Pago con Tarjeta de Crédito
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de tarjeta detectado */}
          {cardType !== "unknown" && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Tipo de tarjeta detectado:</span>
              <div className="flex items-center gap-2">
                {getCardIcon()}
                <span className="font-semibold">{getCardTypeName(cardType)}</span>
              </div>
            </div>
          )}

          {/* Número de tarjeta */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Número de Tarjeta *
            </label>
            <div className="relative">
              <Input
                type="text"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => handleCardNumberChange(e.target.value)}
                maxLength={cardType === "amex" ? 17 : 19}
                disabled={disabled || loading}
                className={`pr-10 ${errors.cardNumber ? "border-red-500" : ""}`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {getCardIcon()}
              </div>
            </div>
            {errors.cardNumber && (
              <p className="text-sm text-red-500 mt-1">{errors.cardNumber}</p>
            )}
          </div>

          {/* Nombre del titular */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Nombre del Titular *
            </label>
            <Input
              type="text"
              placeholder="Como aparece en la tarjeta"
              value={cardholderName}
              onChange={(e) => {
                setCardholderName(e.target.value);
                if (errors.cardholderName) {
                  setErrors((prev) => ({ ...prev, cardholderName: "" }));
                }
              }}
              disabled={disabled || loading}
              className={errors.cardholderName ? "border-red-500" : ""}
            />
            {errors.cardholderName && (
              <p className="text-sm text-red-500 mt-1">{errors.cardholderName}</p>
            )}
          </div>

          {/* Fecha de expiración y CVV */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Fecha de Expiración *
              </label>
              <Input
                type="text"
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => handleExpiryChange(e.target.value)}
                maxLength={5}
                disabled={disabled || loading}
                className={errors.expiry ? "border-red-500" : ""}
              />
              {errors.expiry && (
                <p className="text-sm text-red-500 mt-1">{errors.expiry}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                CVV *
              </label>
              <Input
                type="text"
                placeholder={cardType === "amex" ? "1234" : "123"}
                value={cvv}
                onChange={(e) => handleCVVChange(e.target.value)}
                maxLength={cardType === "amex" ? 4 : 3}
                disabled={disabled || loading}
                className={errors.cvv ? "border-red-500" : ""}
              />
              {errors.cvv && (
                <p className="text-sm text-red-500 mt-1">{errors.cvv}</p>
              )}
            </div>
          </div>

          {/* Monto */}
          <div className="pt-2 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total a pagar:</span>
              <span className="text-lg font-bold">{new Intl.NumberFormat("es-PA", {
                style: "currency",
                currency: "USD",
              }).format(amount)}</span>
            </div>
          </div>

          {/* Botón de envío */}
          <Button
            type="submit"
            disabled={disabled || loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Procesando pago...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Pagar {new Intl.NumberFormat("es-PA", {
                  style: "currency",
                  currency: "USD",
                }).format(amount)}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            🔒 Tus datos están protegidos. No almacenamos información de tu tarjeta.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

