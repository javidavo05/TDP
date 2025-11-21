"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { UniversalThemeToggle } from "@/components/ui/UniversalThemeToggle";

interface Passenger {
  ticketId: string;
  passengerName: string;
  seatId: string;
  boardingStopId: string | null;
  status: string;
}

interface Stop {
  stopId: string;
  stopName: string;
  kmPosition: number;
  orderIndex: number;
  passengerCount: number;
  passengers: Passenger[];
}

interface GPSPosition {
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  timestamp: Date;
}

export default function DriverMobilePage() {
  const [tracking, setTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState<any>(null);
  const [position, setPosition] = useState<GPSPosition | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedStop, setSelectedStop] = useState<string | null>(null);
  const [incident, setIncident] = useState({ type: "", description: "" });

  useEffect(() => {
    // Fetch current trip
    fetchCurrentTrip();
  }, []);

  useEffect(() => {
    if (tracking && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newPosition: GPSPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            speed: pos.coords.speed ? pos.coords.speed * 3.6 : null, // Convert to km/h
            heading: pos.coords.heading || null,
            timestamp: new Date(),
          };
          setPosition(newPosition);
          if (currentTrip) {
            sendGPSUpdate(currentTrip.id, currentTrip.busId, newPosition);
          }
        },
        (error) => {
          console.error("GPS error:", error);
          alert("Error al acceder al GPS. Verifica los permisos.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [tracking, currentTrip]);

  const fetchCurrentTrip = async () => {
    // TODO: Fetch from API - for now use a mock trip ID
    const tripId = "trip-1"; // This should come from the actual trip assignment
    setCurrentTrip({
      id: tripId,
      busId: "bus-1",
      route: { origin: "Panamá", destination: "David" },
      departureTime: new Date().toISOString(),
    });
    fetchStops(tripId);
  };

  const fetchStops = async (tripId: string) => {
    try {
      const response = await fetch(`/api/mobile/driver/trips/${tripId}/stops`);
      if (response.ok) {
        const data = await response.json();
        setStops(data.stops || []);
        // Select first stop by default if available
        if (data.stops && data.stops.length > 0 && !selectedStop) {
          setSelectedStop(data.stops[0].stopId);
        }
      } else {
        console.error("Failed to fetch stops");
        setStops([]);
      }
    } catch (error) {
      console.error("Error fetching stops:", error);
      setStops([]);
    }
  };

  const sendGPSUpdate = async (tripId: string, busId: string, pos: GPSPosition) => {
    try {
      await fetch("/api/gps/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          busId,
          latitude: pos.latitude,
          longitude: pos.longitude,
          speed: pos.speed,
          heading: pos.heading,
        }),
      });
    } catch (error) {
      console.error("Error sending GPS update:", error);
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      alert("Tu dispositivo no soporta GPS");
      return;
    }
    setTracking(true);
  };

  const stopTracking = () => {
    setTracking(false);
  };

  const markPassengerBoarded = (ticketId: string, stopId: string) => {
    setStops((prev) =>
      prev.map((stop) => {
        if (stop.stopId === stopId) {
          return {
            ...stop,
            passengers: stop.passengers.map((p) =>
              p.ticketId === ticketId ? { ...p, status: "boarded" } : p
            ),
          };
        }
        return stop;
      })
    );
  };

  const markPassengerNoShow = (ticketId: string, stopId: string) => {
    setStops((prev) =>
      prev.map((stop) => {
        if (stop.stopId === stopId) {
          return {
            ...stop,
            passengers: stop.passengers.map((p) =>
              p.ticketId === ticketId ? { ...p, status: "no_show" } : p
            ),
          };
        }
        return stop;
      })
    );
  };

  const selectedStopData = stops.find((s) => s.stopId === selectedStop);

  const reportIncident = async () => {
    if (!incident.type || !incident.description) {
      alert("Por favor completa todos los campos");
      return;
    }

    try {
      // TODO: Send to API
      alert("Incidente reportado");
      setIncident({ type: "", description: "" });
    } catch (error) {
      console.error("Error reporting incident:", error);
      alert("Error al reportar el incidente");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Driver Dashboard</h1>
            {currentTrip && (
              <p className="text-muted-foreground">
                {currentTrip.route.origin} → {currentTrip.route.destination}
              </p>
            )}
          </div>
          <UniversalThemeToggle />
        </div>

        {/* GPS Tracking */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">GPS Tracking</h2>
          {position && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Latitud</p>
                <p className="font-mono text-sm">{position.latitude.toFixed(6)}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Longitud</p>
                <p className="font-mono text-sm">{position.longitude.toFixed(6)}</p>
              </div>
              {position.speed && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Velocidad</p>
                  <p className="font-semibold text-lg">{position.speed.toFixed(1)} km/h</p>
                </div>
              )}
              {position.heading && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Dirección</p>
                  <p className="font-semibold text-lg">{position.heading.toFixed(0)}°</p>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-4">
            {!tracking ? (
              <button
                onClick={startTracking}
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary-dark transition-colors font-semibold"
              >
                Iniciar Tracking
              </button>
            ) : (
              <button
                onClick={stopTracking}
                className="flex-1 px-6 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors font-semibold"
              >
                Detener Tracking
              </button>
            )}
          </div>
        </div>

        {/* Stops List - Main View */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Lista de Paradas</h2>
          {stops.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay paradas con pasajeros para este viaje
            </div>
          ) : (
            <div className="space-y-3">
              {stops.map((stop) => (
                <div
                  key={stop.stopId}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedStop === stop.stopId
                      ? "bg-primary/10 border-primary"
                      : "bg-muted/50 border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedStop(stop.stopId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{stop.stopName}</div>
                      <div className="text-sm text-muted-foreground">
                        {stop.kmPosition} km • {stop.passengerCount} pasajero{stop.passengerCount !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {stop.passengerCount}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Passengers for Selected Stop */}
        {selectedStopData && (
          <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Pasajeros - {selectedStopData.stopName}</h2>
              <span className="text-sm text-muted-foreground">
                {selectedStopData.passengers.filter((p) => p.status === "boarded").length}/{selectedStopData.passengers.length} abordados
              </span>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {selectedStopData.passengers.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No hay pasajeros para esta parada
                </div>
              ) : (
                selectedStopData.passengers.map((passenger) => (
                  <div
                    key={passenger.ticketId}
                    className={`p-4 rounded-lg border ${
                      passenger.status === "boarded"
                        ? "bg-success/10 border-success/20"
                        : passenger.status === "no_show"
                        ? "bg-destructive/10 border-destructive/20"
                        : "bg-muted/50 border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-semibold">{passenger.passengerName}</div>
                        <div className="text-sm text-muted-foreground">
                          Asiento {passenger.seatId.substring(0, 8)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {passenger.status === "pending" || passenger.status === "confirmed" ? (
                          <>
                            <button
                              onClick={() => markPassengerBoarded(passenger.ticketId, selectedStopData.stopId)}
                              className="px-3 py-1 bg-success text-success-foreground rounded text-sm font-medium"
                            >
                              Abordó
                            </button>
                            <button
                              onClick={() => markPassengerNoShow(passenger.ticketId, selectedStopData.stopId)}
                              className="px-3 py-1 bg-destructive text-destructive-foreground rounded text-sm font-medium"
                            >
                              No Show
                            </button>
                          </>
                        ) : passenger.status === "boarded" ? (
                          <span className="px-3 py-1 bg-success text-success-foreground rounded text-sm font-medium">
                            ✓ Abordado
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-destructive text-destructive-foreground rounded text-sm font-medium">
                            No Show
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Incident Report */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Reportar Incidente</h2>
          <div className="space-y-4">
            <select
              value={incident.type}
              onChange={(e) => setIncident({ ...incident, type: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Seleccionar tipo</option>
              <option value="accident">Accidente</option>
              <option value="breakdown">Avería</option>
              <option value="delay">Retraso</option>
              <option value="other">Otro</option>
            </select>
            <textarea
              value={incident.description}
              onChange={(e) => setIncident({ ...incident, description: e.target.value })}
              placeholder="Descripción del incidente..."
              rows={4}
              className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={reportIncident}
              className="w-full px-6 py-3 bg-warning text-warning-foreground rounded-lg hover:bg-warning/90 transition-colors font-semibold"
            >
              Reportar Incidente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
