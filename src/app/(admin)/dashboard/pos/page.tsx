"use client";

import { useState, useEffect, Fragment } from "react";
import { TouchSeatSelector } from "@/components/pos/TouchSeatSelector";
import { TouchButton } from "@/components/pos/TouchButton";
import { format } from "date-fns";
import Link from "next/link";

type Step = "trip" | "seat" | "passenger" | "confirm";
type StepStatus = "current" | "completed" | "upcoming";

const STEP_SEQUENCE: Step[] = ["trip", "seat", "passenger", "confirm"];
const STEP_META: Array<{ id: Step; label: string; number: string }> = [
  { id: "trip", label: "Viaje", number: "1" },
  { id: "seat", label: "Asiento", number: "2" },
  { id: "passenger", label: "Pasajero", number: "3" },
];

const STATUS_TEXT_CLASS: Record<StepStatus, string> = {
  current: "text-primary",
  completed: "text-success",
  upcoming: "text-muted-foreground",
};

const STATUS_CIRCLE_CLASS: Record<StepStatus, string> = {
  current: "bg-primary text-primary-foreground",
  completed: "bg-success text-success-foreground",
  upcoming: "bg-muted text-muted-foreground",
};

interface Trip {
  id: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  route: {
    origin: string;
    destination: string;
  };
  bus: {
    seatMap: {
      seats: Array<{
        id: string;
        number: string;
        x: number;
        y: number;
        type: string;
        row: number;
        column: number;
      }>;
    };
  };
  availableSeats: number;
  totalSeats: number;
}

interface Seat {
  id: string;
  number: string;
  x: number;
  y: number;
  type: "single" | "double" | "aisle";
  row: number;
  column: number;
  isAvailable: boolean;
}

export default function POSPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [displaySessionId, setDisplaySessionId] = useState<string | null>(null);
  const [passengerName, setPassengerName] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [passengerDocumentId, setPassengerDocumentId] = useState("");
  const [passengerDocumentType, setPassengerDocumentType] = useState<"cedula" | "pasaporte">("cedula");
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [step, setStep] = useState<Step>("trip");

  useEffect(() => {
    fetchUpcomingTrips();
  }, []);

  const fetchUpcomingTrips = async () => {
    try {
      const response = await fetch("/api/public/trips/upcoming");
      const data = await response.json();
      if (response.ok) {
        setTrips(data.trips || []);
      }
    } catch (error) {
      console.error("Error fetching trips:", error);
    }
  };

  const createDisplaySession = async () => {
    if (!selectedTrip || !selectedSeat) return;

    try {
      const response = await fetch("/api/pos/display/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: selectedTrip.id,
          seatId: selectedSeat,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setDisplaySessionId(data.sessionId);
        window.open(`/displays/pos-client/${data.sessionId}`, "_blank");
      }
    } catch (error) {
      console.error("Error creating display session:", error);
    }
  };

  const processSale = async () => {
    if (!selectedTrip || !selectedSeat || !passengerName || !passengerDocumentId) {
      alert("Por favor completa todos los campos requeridos (nombre y documento)");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/pos/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: selectedTrip.id,
          seatId: selectedSeat,
          passengerName,
          passengerPhone,
          passengerDocumentId,
          passengerDocumentType,
          destinationStopId: selectedTrip.route.destination,
          paymentMethod: "cash",
          amount: selectedTrip.price,
          terminalId: "pos-1", // TODO: Get from auth
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Print thermal ticket (if Electron is available)
        try {
          if (typeof window !== "undefined" && (window as any).electron) {
            const selectedSeatNumber = getSeats().find((s) => s.id === selectedSeat)?.number || "N/A";
            await (window as any).electron.printTicket({
              ticketId: data.ticket.id,
              qrCode: data.ticket.qrCode,
              passengerName: passengerName,
              seatNumber: selectedSeatNumber,
              origin: selectedTrip.route.origin,
              destination: selectedTrip.route.destination,
              departureTime: format(new Date(selectedTrip.departureTime), "dd/MM/yyyy HH:mm"),
              price: selectedTrip.price,
              itbms: selectedTrip.price * 0.07,
              total: selectedTrip.price * 1.07,
              ticketNumber: data.ticket.id.substring(0, 8).toUpperCase(),
            });
          }
        } catch (printError) {
          console.error("Error printing ticket:", printError);
          // Continue even if printing fails
        }

        // Print fiscal invoice (if Electron is available)
        try {
          if (typeof window !== "undefined" && (window as any).electron) {
            await (window as any).electron.sendToFiscal({
              ticketId: data.ticket.id,
              items: [{
                description: `Boleto ${selectedTrip.route.origin} → ${selectedTrip.route.destination}`,
                quantity: 1,
                unitPrice: selectedTrip.price,
                total: selectedTrip.price,
              }],
              subtotal: selectedTrip.price,
              itbms: selectedTrip.price * 0.07,
              total: selectedTrip.price * 1.07,
              paymentMethod: "cash",
              passengerName: passengerName,
              passengerDocumentId: passengerDocumentId,
              terminalId: "pos-1",
            });
          }
        } catch (fiscalError) {
          console.error("Error printing fiscal invoice:", fiscalError);
          // Continue even if fiscal printing fails
        }

        alert("✓ Venta procesada exitosamente");
        // Reset form
        setSelectedTrip(null);
        setSelectedSeat(null);
        setPassengerName("");
        setPassengerPhone("");
        setPassengerDocumentId("");
        setPassengerDocumentType("cedula");
        setDisplaySessionId(null);
        setStep("trip");
        fetchUpcomingTrips();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Error al procesar la venta"}`);
      }
    } catch (error) {
      console.error("Error processing sale:", error);
      alert("Error al procesar la venta");
    } finally {
      setIsProcessing(false);
    }
  };

  const getSeats = (): Seat[] => {
    if (!selectedTrip?.bus?.seatMap?.seats) return [];

    // Get booked seats for this trip
    // TODO: Fetch from API
    const bookedSeats: string[] = [];

    return selectedTrip.bus.seatMap.seats.map((seat) => ({
      id: seat.id,
      number: seat.number,
      x: seat.x,
      y: seat.y,
      type: (seat.type as "single" | "double" | "aisle") || "single",
      row: seat.row,
      column: seat.column,
      isAvailable: !bookedSeats.includes(seat.id),
    }));
  };

  const filteredTrips = trips.filter((trip) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      trip.route.origin.toLowerCase().includes(query) ||
      trip.route.destination.toLowerCase().includes(query)
    );
  });

  const handleTripSelect = (trip: Trip) => {
    setSelectedTrip(trip);
    setSelectedSeat(null);
    setStep("seat");
  };

  const handleSeatSelect = (seatId: string) => {
    setSelectedSeat(seatId);
    setStep("passenger");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-primary hover:text-primary-dark mb-2 inline-block text-lg"
            >
              ← Volver al Dashboard
            </Link>
            <h1 className="text-4xl font-bold">Terminal POS</h1>
            <p className="text-muted-foreground text-lg mt-1">Terminal: POS-001</p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="mb-6 flex items-center justify-center gap-4">
          {STEP_META.map((meta, index) => {
            const currentIndex = STEP_SEQUENCE.indexOf(step);
            const targetIndex = STEP_SEQUENCE.indexOf(meta.id);
            const status: StepStatus =
              currentIndex === targetIndex
                ? "current"
                : currentIndex > targetIndex
                ? "completed"
                : "upcoming";

            return (
              <Fragment key={meta.id}>
                <div className={`flex items-center gap-2 ${STATUS_TEXT_CLASS[status]}`}>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${STATUS_CIRCLE_CLASS[status]}`}
                  >
                    {status === "completed" ? "✓" : meta.number}
                  </div>
                  <span className="font-semibold text-lg">{meta.label}</span>
                </div>
                {index < STEP_META.length - 1 && <div className="w-16 h-1 bg-border" />}
              </Fragment>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Trip Selection and Seat Map */}
          <div className="lg:col-span-2 space-y-6">
            {/* Trip Selection */}
            {(step === "trip" || !selectedTrip) && (
              <div className="bg-card border-2 border-border rounded-2xl p-6 md:p-8 shadow-lg">
                <h2 className="text-2xl font-bold mb-6">Seleccionar Viaje</h2>
                <input
                  type="text"
                  placeholder="Buscar por origen o destino..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-6 py-4 bg-background border-2 border-input rounded-xl mb-6 text-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[64px]"
                />
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {filteredTrips.map((trip) => (
                    <TouchButton
                      key={trip.id}
                      onClick={() => handleTripSelect(trip)}
                      variant={selectedTrip?.id === trip.id ? "primary" : "secondary"}
                      size="lg"
                      className="w-full text-left justify-start"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <div className="font-bold text-xl mb-1">
                            {trip.route.origin} → {trip.route.destination}
                          </div>
                          <div className="text-base text-muted-foreground">
                            {format(new Date(trip.departureTime), "HH:mm")} - {format(new Date(trip.arrivalTime), "HH:mm")}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-2xl">${trip.price.toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">
                            {trip.availableSeats} disponibles
                          </div>
                        </div>
                      </div>
                    </TouchButton>
                  ))}
                </div>
              </div>
            )}

            {/* Seat Map */}
            {selectedTrip && (step === "seat" || step === "passenger" || step === "confirm") && (
              <div className="bg-card border-2 border-border rounded-2xl p-6 md:p-8 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Mapa de Asientos</h2>
                    <p className="text-lg text-muted-foreground">
                      {selectedTrip.route.origin} → {selectedTrip.route.destination}
                    </p>
                  </div>
                  {selectedSeat && (
                    <TouchButton
                      onClick={createDisplaySession}
                      variant="secondary"
                      size="md"
                    >
                      Pantalla Cliente
                    </TouchButton>
                  )}
                </div>
                <TouchSeatSelector
                  seats={getSeats()}
                  selectedSeatId={selectedSeat}
                  onSeatSelect={handleSeatSelect}
                />
              </div>
            )}
          </div>

          {/* Right Column - Passenger Info and Sale */}
          <div className="lg:col-span-1">
            <div className="bg-card border-2 border-border rounded-2xl p-6 md:p-8 shadow-lg sticky top-4">
              <h2 className="text-2xl font-bold mb-6">Información de Venta</h2>

              {selectedTrip && (
                <div className="space-y-4 mb-6 p-4 bg-muted/50 rounded-xl">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Viaje</p>
                    <p className="font-bold text-xl">
                      {selectedTrip.route.origin} → {selectedTrip.route.destination}
                    </p>
                  </div>

                  {selectedSeat && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Asiento</p>
                      <p className="font-bold text-3xl text-primary">{selectedSeat}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Precio</p>
                    <p className="font-bold text-3xl text-primary">
                      ${selectedTrip.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {selectedSeat && (step === "passenger" || step === "confirm") && (
                <div className="space-y-6 border-t-2 border-border pt-6">
                  <div>
                    <label className="block text-lg font-semibold mb-3">
                      Nombre del Pasajero *
                    </label>
                    <input
                      type="text"
                      value={passengerName}
                      onChange={(e) => setPassengerName(e.target.value)}
                      className="w-full px-6 py-5 bg-background border-2 border-input rounded-xl text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-primary min-h-[64px]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-semibold mb-3">
                      Teléfono (Opcional)
                    </label>
                    <input
                      type="tel"
                      value={passengerPhone}
                      onChange={(e) => setPassengerPhone(e.target.value)}
                      className="w-full px-6 py-5 bg-background border-2 border-input rounded-xl text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-primary min-h-[64px]"
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-semibold mb-3">
                      Tipo de Documento *
                    </label>
                    <select
                      value={passengerDocumentType}
                      onChange={(e) => setPassengerDocumentType(e.target.value as "cedula" | "pasaporte")}
                      className="w-full px-6 py-5 bg-background border-2 border-input rounded-xl text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-primary min-h-[64px]"
                      required
                    >
                      <option value="cedula">Cédula</option>
                      <option value="pasaporte">Pasaporte</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-lg font-semibold mb-3">
                      {passengerDocumentType === "cedula" ? "Cédula" : "Pasaporte"} *
                    </label>
                    <input
                      type="text"
                      value={passengerDocumentId}
                      onChange={(e) => setPassengerDocumentId(e.target.value)}
                      placeholder={passengerDocumentType === "cedula" ? "8-1234-5678" : "A123456"}
                      className="w-full px-6 py-5 bg-background border-2 border-input rounded-xl text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-primary min-h-[64px]"
                      required
                    />
                  </div>

                  <div className="flex gap-4">
                    <TouchButton
                      onClick={() => {
                        setStep("seat");
                        setSelectedSeat(null);
                      }}
                      variant="secondary"
                      size="lg"
                      className="flex-1"
                    >
                      Atrás
                    </TouchButton>
                    <TouchButton
                      onClick={processSale}
                      disabled={isProcessing || !passengerName || !passengerDocumentId}
                      variant="success"
                      size="lg"
                      className="flex-1"
                    >
                      {isProcessing ? "Procesando..." : "Procesar Venta"}
                    </TouchButton>
                  </div>
                </div>
              )}

              {!selectedSeat && selectedTrip && (
                <div className="text-center py-8 text-muted-foreground text-lg">
                  Selecciona un asiento para continuar
                </div>
              )}

              {displaySessionId && (
                <div className="mt-6 p-4 bg-muted rounded-xl">
                  <p className="text-sm text-muted-foreground mb-2">Sesión de Pantalla</p>
                  <p className="font-mono text-xs break-all">{displaySessionId}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
