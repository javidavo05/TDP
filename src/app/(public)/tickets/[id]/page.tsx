"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { formatDateTime, formatCurrency } from "@/lib/utils";

export default function TicketDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const success = searchParams.get("success");

  useEffect(() => {
    if (params.id) {
      fetchTicket();
    }
  }, [params.id]);

  const fetchTicket = async () => {
    try {
      const response = await fetch(`/api/public/tickets/${params.id}`);
      const data = await response.json();
      if (response.ok) {
        setTicket(data.ticket);
      }
    } catch (error) {
      console.error("Error fetching ticket:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-destructive">Ticket no encontrado</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            ¡Compra realizada exitosamente!
          </div>
        )}

        <h1 className="text-3xl font-bold mb-8">Detalle del Ticket</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Información del Ticket</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Código QR</p>
                <p className="font-mono font-semibold">{ticket.qrCode}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pasajero</p>
                <p className="font-semibold">{ticket.passengerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <p className="font-semibold capitalize">{ticket.status}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Compra</p>
                <p>{formatDateTime(ticket.createdAt)}</p>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Información de Pago</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(ticket.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ITBMS</span>
                <span>{formatCurrency(ticket.itbms)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(ticket.totalPrice)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-card p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Código QR</h2>
          <div className="bg-muted p-8 rounded-lg text-center">
            <div className="inline-block bg-white p-4 rounded">
              {/* QR Code would be displayed here */}
              <p className="font-mono text-sm">{ticket.qrCode}</p>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Muestra este código al abordar el bus
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

