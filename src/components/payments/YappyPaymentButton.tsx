"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface YappyPaymentButtonProps {
  amount: number;
  description: string;
  customerInfo: {
    name: string;
    email?: string;
    phone?: string;
  };
  ticketId?: string;
  orderId?: string;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  theme?: "blue" | "darkBlue" | "orange" | "dark" | "sky" | "light";
  rounded?: boolean;
}

export function YappyPaymentButton({
  amount,
  description,
  customerInfo,
  ticketId,
  orderId: externalOrderId,
  onSuccess,
  onError,
  disabled = false,
  className = "",
  theme = "orange",
  rounded = true,
}: YappyPaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(externalOrderId || null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Cargar el script del componente web de Yappy una sola vez
  useEffect(() => {
    if (scriptLoaded) return;

    // Verificar si el script ya está cargado
    if (document.querySelector('script[src*="web-component-btn-yappy"]')) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://bt-cdn.yappy.cloud/v1/cdn/web-component-btn-yappy.js";
    script.async = true;
    script.onload = () => {
      setScriptLoaded(true);
    };
    script.onerror = () => {
      console.error("Error loading Yappy button script");
      if (onError) {
        onError("Error al cargar el componente de Yappy");
      }
    };
    document.head.appendChild(script);

    return () => {
      // No remover el script para evitar recargas innecesarias
    };
  }, [onError]);

  const handleCreateOrder = async () => {
    if (!ticketId) {
      if (onError) {
        onError("Ticket ID es requerido para crear la orden");
      }
      return;
    }

    setLoading(true);

    try {
      // Crear la orden de pago
      const response = await fetch("/api/public/payments/yappy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          customerInfo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al crear orden de pago con Yappy");
      }

      const orderId = data.orderId || data.yappyPayment?.transactionId || data.yappyPayment?.metadata?.orderId;
      if (!orderId) {
        throw new Error("No se recibió orderId de Yappy");
      }

      setCurrentOrderId(orderId);
      setOrderCreated(true);
      setLoading(false);
    } catch (error) {
      const errorMessage = (error as Error).message || "Error al procesar pago";
      console.error("Yappy payment error:", error);
      
      if (onError) {
        onError(errorMessage);
      } else {
        alert(errorMessage);
      }
      setLoading(false);
    }
  };

  // Si tenemos un orderId externo, mostrar el botón directamente
  useEffect(() => {
    if (externalOrderId && !orderCreated) {
      setCurrentOrderId(externalOrderId);
      setOrderCreated(true);
    }
  }, [externalOrderId, orderCreated]);

  // Si no hay orden creada, mostrar botón para crear orden
  if (!orderCreated) {
    return (
      <button
        onClick={handleCreateOrder}
        disabled={disabled || loading || !ticketId}
        className={`
          w-full px-6 py-4 rounded-lg font-semibold
          bg-gradient-to-r from-yellow-400 to-yellow-500
          hover:from-yellow-500 hover:to-yellow-600
          text-white shadow-lg hover:shadow-xl
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2
          ${className}
        `}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Creando orden...</span>
          </>
        ) : (
          <>
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.72-2.81 0-1.65-1.28-2.56-3.65-3.14z" />
            </svg>
            <span>Pagar con Yappy</span>
          </>
        )}
      </button>
    );
  }

  // Mostrar el componente web de Yappy
  if (!currentOrderId) {
    return null;
  }

  return (
    <div className={className}>
      {React.createElement("btn-yappy", {
        theme: theme,
        rounded: rounded ? "true" : "false",
        "merchant-id": process.env.NEXT_PUBLIC_YAPPY_MERCHANT_ID || "MVZQO-44905104",
        "order-id": currentOrderId,
        amount: amount.toString(),
        description: description,
      })}
    </div>
  );
}

