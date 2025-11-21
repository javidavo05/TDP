"use client";

import { CreditCardForm } from "./CreditCardForm";

interface PagueloFacilPaymentButtonProps {
  amount: number;
  description: string;
  customerInfo: {
    name: string;
    email?: string;
    phone?: string;
  };
  ticketId?: string;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Componente que muestra el formulario de tarjeta de crédito de PagueloFacil
 * Reemplaza el botón simple con un formulario completo para procesar pagos con tarjeta
 */
export function PagueloFacilPaymentButton({
  amount,
  description,
  customerInfo,
  ticketId,
  onSuccess,
  onError,
  disabled = false,
  className = "",
}: PagueloFacilPaymentButtonProps) {
  return (
    <CreditCardForm
      amount={amount}
      description={description}
      ticketId={ticketId}
      onSuccess={onSuccess}
      onError={onError}
      disabled={disabled}
      className={className}
    />
  );
}

