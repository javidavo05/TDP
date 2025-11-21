"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatCurrency, calculateITBMS, ITBMS_RATE } from "@/lib/utils";
import { YappyPaymentButton } from "@/components/payments/YappyPaymentButton";
import { PagueloFacilPaymentButton } from "@/components/payments/PagueloFacilPaymentButton";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState({
    passengerName: "",
    passengerEmail: "",
    passengerPhone: "",
    passengerDocumentId: "",
    passengerDocumentType: "cedula" as "cedula" | "pasaporte",
    paymentMethod: "yappy" as string,
  });
  const [ticketId, setTicketId] = useState<string | null>(null);

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
    
    // Si es Yappy o PagueloFacil, el componente manejará el pago
    if (formData.paymentMethod === "yappy" || formData.paymentMethod === "paguelofacil") {
      // Solo crear el ticket si no existe
      if (!ticketId) {
        setProcessing(true);
        try {
          const ticketResponse = await fetch("/api/public/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tripId,
              seatId,
              passengerName: formData.passengerName,
              passengerEmail: formData.passengerEmail,
              passengerPhone: formData.passengerPhone,
              passengerDocumentId: formData.passengerDocumentId,
              passengerDocumentType: formData.passengerDocumentType,
              price: trip.price,
              destinationStopId: trip.routeId,
            }),
          });

          const ticketData = await ticketResponse.json();
          if (!ticketResponse.ok) {
            throw new Error(ticketData.error);
          }

          setTicketId(ticketData.ticket.id);
        } catch (error) {
          alert((error as Error).message || "Error al crear el ticket");
        } finally {
          setProcessing(false);
        }
      }
      return;
    }

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
          passengerDocumentId: formData.passengerDocumentId,
          passengerDocumentType: formData.passengerDocumentType,
          price: trip.price,
          destinationStopId: trip.routeId, // This should come from trip data
        }),
      });

      const ticketData = await ticketResponse.json();
      if (!ticketResponse.ok) {
        throw new Error(ticketData.error);
      }

      setTicketId(ticketData.ticket.id);

      // Si el método de pago es Yappy, no procesamos el pago aquí
      // El botón Yappy lo manejará
      if (formData.paymentMethod === "yappy") {
        // El pago se procesará cuando el usuario haga clic en el botón Yappy
        return;
      }

      // Process payment for other methods
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
                <div>
                  <label className="block text-sm font-medium mb-2">Tipo de Documento *</label>
                  <select
                    required
                    value={formData.passengerDocumentType}
                    onChange={(e) => setFormData({ ...formData, passengerDocumentType: e.target.value as "cedula" | "pasaporte" })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="cedula">Cédula</option>
                    <option value="pasaporte">Pasaporte</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {formData.passengerDocumentType === "cedula" ? "Cédula" : "Pasaporte"} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.passengerDocumentId}
                    onChange={(e) => setFormData({ ...formData, passengerDocumentId: e.target.value })}
                    placeholder={formData.passengerDocumentType === "cedula" ? "8-1234-5678" : "A123456"}
                    className="w-full p-2 border rounded"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.passengerDocumentType === "cedula" 
                      ? "Formato: 8-1234-5678" 
                      : "Formato: A123456 (6-9 caracteres alfanuméricos)"}
                  </p>
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
              {formData.paymentMethod === "yappy" ? (
                <YappyPaymentButton
                  amount={total}
                  description={`Boleto TDP - ${formData.passengerName}`}
                  customerInfo={{
                    name: formData.passengerName,
                    email: formData.passengerEmail,
                    phone: formData.passengerPhone,
                  }}
                  ticketId={ticketId || undefined}
                  theme="orange"
                  rounded={true}
                  onSuccess={(orderId) => {
                    // El IPN de Yappy actualizará el ticket cuando se complete el pago
                    // Redirigir a la página del ticket
                    if (ticketId) {
                      router.push(`/tickets/${ticketId}?payment=pending&yappy=${orderId}`);
                    }
                  }}
                  onError={(error) => {
                    alert(`Error: ${error}`);
                  }}
                  disabled={processing || !formData.passengerName || !formData.passengerDocumentId}
                />
              ) : formData.paymentMethod === "paguelofacil" ? (
                <PagueloFacilPaymentButton
                  amount={total}
                  description={`Boleto TDP - ${formData.passengerName}`}
                  customerInfo={{
                    name: formData.passengerName,
                    email: formData.passengerEmail,
                    phone: formData.passengerPhone,
                  }}
                  ticketId={ticketId || undefined}
                  onSuccess={(transactionId) => {
                    // El webhook de PagueloFacil actualizará el ticket cuando se complete el pago
                    // Redirigir a la página del ticket
                    if (ticketId) {
                      router.push(`/tickets/${ticketId}?payment=pending&paguelofacil=${transactionId}`);
                    }
                  }}
                  onError={(error) => {
                    alert(`Error: ${error}`);
                  }}
                  disabled={processing || !formData.passengerName || !formData.passengerDocumentId}
                />
              ) : (
                <button
                  type="submit"
                  disabled={processing || !formData.passengerName || !formData.passengerDocumentId}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold disabled:opacity-50"
                >
                  {processing ? "Procesando..." : "Completar Compra"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}

