"use client";

import { useState, useEffect } from "react";
import { SeatSelector } from "@/components/public/SeatSelector";
import { seatAvailabilityService } from "@/lib/realtime/seatAvailability";
import { useRealtimeSeats } from "@/hooks/useRealtimeSeats";
import { format } from "date-fns";
import { UniversalThemeToggle } from "@/components/ui/UniversalThemeToggle";

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
        alert("Venta procesada exitosamente");
        // Reset form
        setSelectedSeat(null);
        setPassengerName("");
        setPassengerPhone("");
        setPassengerDocumentId("");
        setPassengerDocumentType("cedula");
        setDisplaySessionId(null);
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

  // Use realtime seats hook for selected trip
  const { lockedSeats } = useRealtimeSeats(selectedTrip?.id || null);
  const [soldSeats, setSoldSeats] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!selectedTrip) return;

    // Fetch sold seats for this trip
    const fetchSoldSeats = async () => {
      try {
        const response = await fetch(`/api/public/trips/${selectedTrip.id}/seats`);
        if (response.ok) {
          const data = await response.json();
          setSoldSeats(new Set(data.soldSeats || []));
        }
      } catch (error) {
        console.error("Error fetching sold seats:", error);
      }
    };

    fetchSoldSeats();

    // Subscribe to real-time updates
    const unsubscribe = seatAvailabilityService.subscribe(selectedTrip.id, {
      onSeatSold: (seatId) => {
        setSoldSeats((prev) => new Set([...prev, seatId]));
      },
      onSeatLocked: () => {
        // Locked seats are handled by useRealtimeSeats hook
      },
      onSeatUnlocked: () => {
        // Unlocked seats are handled by useRealtimeSeats hook
      },
    });

    return () => {
      unsubscribe();
    };
  }, [selectedTrip?.id]);

  const getSeats = () => {
    if (!selectedTrip?.bus?.seatMap?.seats) return [];

    return selectedTrip.bus.seatMap.seats.map((seat) => {
      const isSold = soldSeats.has(seat.id);
      const isLocked = lockedSeats.includes(seat.id);
      
      let status: "available" | "sold" | "selected" | "locked" | "disabled" | "extra_space" | "stair" | "aisle" = "available";
      if (isSold) status = "sold";
      else if (isLocked) status = "locked";
      else if (seat.type === "disabled") status = "disabled";
      else if (seat.type === "extra_space") status = "extra_space";
      else if (seat.type === "stair") status = "stair";
      else if (seat.type === "aisle") status = "aisle";
      else if (seat.id === selectedSeat) status = "selected";

      return {
        id: seat.id,
        number: seat.number,
        x: seat.x,
        y: seat.y,
        type: (seat.type as "single" | "double" | "aisle" | "disabled" | "extra_space" | "stair") || "single",
        row: seat.row,
        column: seat.column,
        floor: 1,
        status,
        isAvailable: !isSold && !isLocked,
        isSelected: seat.id === selectedSeat,
        isLocked,
      };
    });
  };

  const filteredTrips = trips.filter((trip) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      trip.route.origin.toLowerCase().includes(query) ||
      trip.route.destination.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Terminal POS</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Terminal: POS-001
            </div>
            <UniversalThemeToggle />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Trip Selection and Seat Map */}
          <div className="lg:col-span-2 space-y-6">
            {/* Trip Selection */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Seleccionar Viaje</h2>
              <input
                type="text"
                placeholder="Buscar por origen o destino..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredTrips.map((trip) => (
                  <button
                    key={trip.id}
                    onClick={() => {
                      setSelectedTrip(trip);
                      setSelectedSeat(null);
                    }}
                    className={`w-full p-4 text-left border rounded-lg transition-all ${
                      selectedTrip?.id === trip.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">
                          {trip.route.origin} → {trip.route.destination}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(trip.departureTime), "HH:mm")} - {format(new Date(trip.arrivalTime), "HH:mm")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary">${trip.price.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">
                          {trip.availableSeats} disponibles
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Seat Map */}
            {selectedTrip && (
              <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Mapa de Asientos</h2>
                  {selectedSeat && (
                    <button
                      onClick={createDisplaySession}
                      className="px-4 py-2 bg-primary hover:bg-primary-dark text-primary-foreground rounded-lg transition-colors text-sm"
                    >
                      Mostrar en Pantalla Cliente
                    </button>
                  )}
                </div>
                <SeatSelector
                  seats={getSeats()}
                  selectedSeatId={selectedSeat}
                  onSeatSelect={async (seatId) => {
                    if (selectedTrip) {
                      // Lock the seat when selected
                      await seatAvailabilityService.lockSeat(selectedTrip.id, seatId, 30000);
                      setSelectedSeat(seatId);
                    }
                  }}
                  lockedSeats={lockedSeats}
                  tripId={selectedTrip?.id || ""}
                  className="min-h-[400px]"
                  showLegend={true}
                />
              </div>
            )}
          </div>

          {/* Right Column - Sale Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl p-6 shadow-lg sticky top-4">
              <h2 className="text-xl font-semibold mb-6">Resumen de Venta</h2>

              {selectedTrip && (
                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Viaje</p>
                    <p className="font-semibold">
                      {selectedTrip.route.origin} → {selectedTrip.route.destination}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedTrip.departureTime), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Asiento Seleccionado</p>
                    <p className="font-semibold text-lg">
                      {selectedSeat ? getSeats().find((s) => s.id === selectedSeat)?.number || "N/A" : "Ninguno"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Precio</p>
                    <p className="font-bold text-2xl text-primary">
                      ${selectedTrip.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {selectedSeat && (
                <div className="space-y-4 border-t border-border pt-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nombre del Pasajero *
                    </label>
                    <input
                      type="text"
                      value={passengerName}
                      onChange={(e) => setPassengerName(e.target.value)}
                      className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Teléfono (Opcional)
                    </label>
                    <input
                      type="tel"
                      value={passengerPhone}
                      onChange={(e) => setPassengerPhone(e.target.value)}
                      className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tipo de Documento *
                    </label>
                    <select
                      value={passengerDocumentType}
                      onChange={(e) => setPassengerDocumentType(e.target.value as "cedula" | "pasaporte")}
                      className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    >
                      <option value="cedula">Cédula</option>
                      <option value="pasaporte">Pasaporte</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {passengerDocumentType === "cedula" ? "Cédula" : "Pasaporte"} *
                    </label>
                    <input
                      type="text"
                      value={passengerDocumentId}
                      onChange={(e) => setPassengerDocumentId(e.target.value)}
                      placeholder={passengerDocumentType === "cedula" ? "8-1234-5678" : "A123456"}
                      className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  <button
                    onClick={processSale}
                    disabled={isProcessing || !passengerName || !passengerDocumentId}
                    className="w-full py-3 px-4 bg-primary hover:bg-primary-dark text-primary-foreground font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? "Procesando..." : "Procesar Venta"}
                  </button>
                </div>
              )}

              {displaySessionId && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Sesión de Pantalla</p>
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
