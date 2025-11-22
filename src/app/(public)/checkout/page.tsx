"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatCurrency, calculateITBMS, ITBMS_RATE } from "@/lib/utils";
import { YappyPaymentButton } from "@/components/payments/YappyPaymentButton";
import { PagueloFacilPaymentButton } from "@/components/payments/PagueloFacilPaymentButton";
import { DiscountForm } from "@/components/public/DiscountForm";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [trip, setTrip] = useState<any>(null);
  const [seats, setSeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [passengers, setPassengers] = useState<Array<{
    seatId: string;
    name: string;
    documentId: string;
    phone: string;
    email: string;
    emergencyPhone: string;
  }>>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("yappy");
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [discount, setDiscount] = useState<{
    couponDiscount: number;
    seniorDiscount: number;
    totalDiscount: number;
    coupon?: { id: string; code: string };
    isSenior: boolean;
    couponCode?: string;
  }>({
    couponDiscount: 0,
    seniorDiscount: 0,
    totalDiscount: 0,
    coupon: undefined,
    isSenior: false,
    couponCode: undefined,
  });

  const tripId = searchParams.get("tripId");
  const seatIdsParam = searchParams.get("seatIds") || searchParams.get("seatId"); // Support both for backward compatibility
  const seatIds = seatIdsParam ? seatIdsParam.split(',').filter(id => id.trim()) : [];

  useEffect(() => {
    if (tripId) {
      fetchTrip();
      fetchSeats();
    }
  }, [tripId]);

  useEffect(() => {
    // Initialize passengers array with one form per seat
    if (seatIds.length > 0 && passengers.length === 0) {
      setPassengers(seatIds.map(seatId => ({
        seatId,
        name: "",
        documentId: "",
        phone: "",
        email: "",
        emergencyPhone: "",
      })));
    }
  }, [seatIds]);

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

  const fetchSeats = async () => {
    try {
      const response = await fetch(`/api/public/trips/${tripId}/seats`);
      const data = await response.json();
      if (response.ok) {
        setSeats(data.seats || []);
      }
    } catch (error) {
      console.error("Error fetching seats:", error);
    }
  };

  const updatePassenger = (index: number, field: string, value: string) => {
    setPassengers(prev => prev.map((p, i) => 
      i === index ? { ...p, [field]: value } : p
    ));
  };

  const getSeatNumber = (seatId: string): string => {
    const seat = seats.find(s => s.id === seatId);
    return seat?.number || seatId;
  };

  const validatePassengers = (): boolean => {
    // Validate that all required fields are filled
    for (const passenger of passengers) {
      if (!passenger.name.trim()) {
        alert("Por favor complete el nombre de todos los pasajeros");
        return false;
      }
      if (!passenger.documentId.trim()) {
        alert("Por favor complete la cédula de todos los pasajeros");
        return false;
      }
      if (!passenger.phone.trim()) {
        alert("Por favor complete el teléfono de todos los pasajeros");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassengers()) {
      return;
    }
    
    // Si es Yappy o PagueloFacil, el componente manejará el pago
    if (paymentMethod === "yappy" || paymentMethod === "paguelofacil") {
      // Solo crear los tickets si no existen
      if (!ticketId && passengers.length > 0) {
        setProcessing(true);
        try {
          // Create tickets for each passenger
          const ticketPromises = passengers.map((passenger) =>
            fetch("/api/public/tickets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tripId,
                seatId: passenger.seatId,
                passengerName: passenger.name,
                passengerEmail: passenger.email,
                passengerPhone: passenger.phone,
                passengerDocumentId: passenger.documentId,
                passengerDocumentType: "cedula", // Default to cedula
                price: subtotalAfterDiscount / passengers.length, // Price per ticket after discounts
                originalPrice: subtotal / passengers.length, // Original price per ticket before discounts
                discountAmount: discount.totalDiscount / passengers.length,
                couponDiscount: discount.couponDiscount / passengers.length,
                seniorDiscount: discount.seniorDiscount / passengers.length,
                discountCode: discount.couponCode,
                isSenior: discount.isSenior,
                destinationStopId: trip.routeId,
                emergencyPhone: passenger.emergencyPhone,
              }),
            })
          );

          const ticketResponses = await Promise.all(ticketPromises);
          const ticketDataArray = await Promise.all(ticketResponses.map(r => r.json()));
          
          const failedTicket = ticketDataArray.find((data, index) => !ticketResponses[index].ok);
          if (failedTicket) {
            throw new Error(failedTicket.error || "Error al crear los tickets");
          }

          // Store first ticket ID for payment processing
          setTicketId(ticketDataArray[0].ticket.id);
        } catch (error) {
          alert((error as Error).message || "Error al crear los tickets");
        } finally {
          setProcessing(false);
        }
      }
      return;
    }

    setProcessing(true);

    try {
      // Create tickets for each passenger
      if (passengers.length === 0) {
        throw new Error("No se han seleccionado asientos");
      }

      const ticketPromises = passengers.map((passenger) =>
        fetch("/api/public/tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tripId,
            seatId: passenger.seatId,
            passengerName: passenger.name,
            passengerEmail: passenger.email,
            passengerPhone: passenger.phone,
            passengerDocumentId: passenger.documentId,
            passengerDocumentType: "cedula", // Default to cedula
            price: subtotalAfterDiscount / passengers.length, // Price per ticket after discounts
            originalPrice: subtotal / passengers.length, // Original price per ticket before discounts
            discountAmount: discount.totalDiscount / passengers.length,
            couponDiscount: discount.couponDiscount / passengers.length,
            seniorDiscount: discount.seniorDiscount / passengers.length,
            discountCode: discount.couponCode,
            isSenior: discount.isSenior,
            destinationStopId: trip.routeId,
            emergencyPhone: passenger.emergencyPhone,
          }),
        })
      );

      const ticketResponses = await Promise.all(ticketPromises);
      const ticketDataArray = await Promise.all(ticketResponses.map(r => r.json()));
      
      const failedTicket = ticketDataArray.find((data, index) => !ticketResponses[index].ok);
      if (failedTicket) {
        throw new Error(failedTicket.error || "Error al crear los tickets");
      }

      // Store first ticket ID for payment processing
      setTicketId(ticketDataArray[0].ticket.id);

      // Si el método de pago es Yappy, no procesamos el pago aquí
      // El botón Yappy lo manejará
      if (paymentMethod === "yappy") {
        // El pago se procesará cuando el usuario haga clic en el botón Yappy
        return;
      }

      // Process payment for other methods (using first ticket ID)
      const paymentResponse = await fetch("/api/public/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: ticketDataArray[0].ticket.id,
          paymentMethod: paymentMethod,
          customerInfo: {
            name: passengers[0].name,
            email: passengers[0].email,
            phone: passengers[0].phone,
          },
        }),
      });

      const paymentData = await paymentResponse.json();
      if (!paymentResponse.ok) {
        throw new Error(paymentData.error);
      }

      // Redirect to success page (first ticket)
      router.push(`/tickets/${ticketDataArray[0].ticket.id}?success=true`);
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

  // Calculate prices with discounts (multiply by number of seats)
  const seatCount = seatIds.length || 1;
  const subtotal = trip.price * seatCount;
  const subtotalAfterDiscount = Math.max(0, subtotal - discount.totalDiscount);
  const itbms = calculateITBMS(subtotalAfterDiscount, ITBMS_RATE);
  const total = subtotalAfterDiscount + itbms;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Discount Form */}
            <DiscountForm
              subtotal={subtotal}
              onDiscountChange={setDiscount}
            />

            {/* Passenger Forms */}
            <div className="space-y-6">
              {passengers.map((passenger, index) => (
                <div key={passenger.seatId} className="bg-card p-6 rounded-lg shadow-md">
                  <h2 className="text-xl font-semibold mb-4">
                    Pasajero {index + 1} - Asiento {getSeatNumber(passenger.seatId)}
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Nombre Completo *</label>
                      <input
                        type="text"
                        required
                        value={passenger.name}
                        onChange={(e) => updatePassenger(index, "name", e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="Nombre completo del pasajero"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Cédula *</label>
                      <input
                        type="text"
                        required
                        value={passenger.documentId}
                        onChange={(e) => updatePassenger(index, "documentId", e.target.value)}
                        placeholder="8-1234-5678"
                        className="w-full p-2 border rounded"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Formato: 8-1234-5678
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Teléfono *</label>
                      <input
                        type="tel"
                        required
                        value={passenger.phone}
                        onChange={(e) => updatePassenger(index, "phone", e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="6000-0000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email (Opcional)</label>
                      <input
                        type="email"
                        value={passenger.email}
                        onChange={(e) => updatePassenger(index, "email", e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="correo@ejemplo.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Teléfono de Emergencia (Opcional)</label>
                      <input
                        type="tel"
                        value={passenger.emergencyPhone}
                        onChange={(e) => updatePassenger(index, "emergencyPhone", e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="6000-0000"
                      />
                    </div>
                  </div>
                </div>
              ))}
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
                      checked={paymentMethod === method}
                      onChange={(e) => setPaymentMethod(e.target.value)}
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
              {seatIds.length > 1 && (
                <div className="mb-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {seatIds.length} asientos seleccionados
                  </p>
                </div>
              )}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Precio por asiento</span>
                  <span>{formatCurrency(trip.price)}</span>
                </div>
                {seatIds.length > 1 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>× {seatIds.length} asientos</span>
                    <span>{formatCurrency(trip.price * seatIds.length)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discount.totalDiscount > 0 && (
                  <>
                    {discount.couponDiscount > 0 && (
                      <div className="flex justify-between text-success">
                        <span>Descuento Cupón</span>
                        <span>-{formatCurrency(discount.couponDiscount)}</span>
                      </div>
                    )}
                    {discount.seniorDiscount > 0 && (
                      <div className="flex justify-between text-success">
                        <span>Descuento Tercera Edad</span>
                        <span>-{formatCurrency(discount.seniorDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-success font-semibold">
                      <span>Total Descuentos</span>
                      <span>-{formatCurrency(discount.totalDiscount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Subtotal con Descuento</span>
                      <span>{formatCurrency(subtotalAfterDiscount)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span>ITBMS (7%)</span>
                  <span>{formatCurrency(itbms)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
              {paymentMethod === "yappy" ? (
                <YappyPaymentButton
                  amount={subtotalAfterDiscount}
                  description={`Boleto TDP - ${passengers.length} pasajero${passengers.length > 1 ? 's' : ''}`}
                  customerInfo={{
                    name: passengers[0]?.name || "",
                    email: passengers[0]?.email || "",
                    phone: passengers[0]?.phone || "",
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
                  disabled={processing || passengers.some(p => !p.name || !p.documentId || !p.phone)}
                />
              ) : paymentMethod === "paguelofacil" ? (
                <PagueloFacilPaymentButton
                  amount={subtotalAfterDiscount}
                  description={`Boleto TDP - ${passengers.length} pasajero${passengers.length > 1 ? 's' : ''}`}
                  customerInfo={{
                    name: passengers[0]?.name || "",
                    email: passengers[0]?.email || "",
                    phone: passengers[0]?.phone || "",
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
                  disabled={processing || passengers.some(p => !p.name || !p.documentId || !p.phone)}
                />
              ) : (
                <button
                  type="submit"
                  disabled={processing || passengers.some(p => !p.name || !p.documentId || !p.phone)}
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

