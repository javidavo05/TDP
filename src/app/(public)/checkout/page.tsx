"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatCurrency, calculateITBMS, ITBMS_RATE } from "@/lib/utils";

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState({
    passengerName: "",
    passengerEmail: "",
    passengerPhone: "",
    paymentMethod: "yappy" as string,
  });

  const tripId = searchParams.get("tripId");
  const seatId = searchParams.get("seatId");

  useEffect(() => {
    if (tripId) {
      fetchTrip();
    }
  }, [tripId]);

  const fetchTrip = async () => {
    try {
      const response = await fetch(`/api/public/trips/${tripId}`);
      const data = await response.json();
      if (response.ok) {
        setTrip(data.trip);
      }
    } catch (error) {
      console.error("Error fetching trip:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      // Create ticket
      const ticketResponse = await fetch("/api/public/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          seatId,
          passengerName: formData.passengerName,
          passengerEmail: formData.passengerEmail,
          passengerPhone: formData.passengerPhone,
          price: trip.price,
          destinationStopId: trip.routeId, // This should come from trip data
        }),
      });

      const ticketData = await ticketResponse.json();
      if (!ticketResponse.ok) {
        throw new Error(ticketData.error);
      }

      // Process payment
      const paymentResponse = await fetch("/api/public/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: ticketData.ticket.id,
          paymentMethod: formData.paymentMethod,
          customerInfo: {
            name: formData.passengerName,
            email: formData.passengerEmail,
            phone: formData.passengerPhone,
          },
        }),
      });

      const paymentData = await paymentResponse.json();
      if (!paymentResponse.ok) {
        throw new Error(paymentData.error);
      }

      // Redirect to success page
      router.push(`/tickets/${ticketData.ticket.id}?success=true`);
    } catch (error) {
      console.error("Error processing checkout:", error);
      alert((error as Error).message || "Error al procesar la compra");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-destructive">Viaje no encontrado</div>
      </div>
    );
  }

  const subtotal = trip.price;
  const itbms = calculateITBMS(subtotal, ITBMS_RATE);
  const total = subtotal + itbms;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Información del Pasajero</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={formData.passengerName}
                    onChange={(e) => setFormData({ ...formData, passengerName: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.passengerEmail}
                    onChange={(e) => setFormData({ ...formData, passengerEmail: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.passengerPhone}
                    onChange={(e) => setFormData({ ...formData, passengerPhone: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
            </div>

            <div className="bg-card p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Método de Pago</h2>
              <div className="space-y-2">
                {PAYMENT_METHODS.filter((m) => m !== "cash").map((method) => (
                  <label key={method} className="flex items-center space-x-2 p-3 border rounded cursor-pointer hover:bg-muted">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method}
                      checked={formData.paymentMethod === method}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    />
                    <span className="capitalize">{method}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-card p-6 rounded-lg shadow-md sticky top-4">
              <h2 className="text-xl font-semibold mb-4">Resumen</h2>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ITBMS (7%)</span>
                  <span>{formatCurrency(itbms)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={processing || !formData.passengerName}
                className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold disabled:opacity-50"
              >
                {processing ? "Procesando..." : "Completar Compra"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

