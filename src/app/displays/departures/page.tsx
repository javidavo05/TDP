"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { UniversalThemeToggle } from "@/components/ui/UniversalThemeToggle";

interface Trip {
  id: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  status: string;
  route: {
    origin: string;
    destination: string;
  };
  bus: {
    plateNumber: string;
    busClass: string;
  };
  availableSeats: number;
  totalSeats: number;
  gate?: string;
}

export default function DeparturesDisplayPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTerminal, setSelectedTerminal] = useState<string>("all");

  useEffect(() => {
    fetchUpcomingTrips();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUpcomingTrips, 30000);
    return () => clearInterval(interval);
  }, [selectedTerminal]);

  const fetchUpcomingTrips = async () => {
    try {
      const response = await fetch("/api/public/trips/upcoming?hours=3");
      const data = await response.json();
      if (response.ok) {
        let filtered = data.trips || [];
        if (selectedTerminal !== "all") {
          filtered = filtered.filter((trip: Trip) => trip.route.origin === selectedTerminal);
        }
        setTrips(filtered);
      }
    } catch (error) {
      console.error("Error fetching upcoming trips:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "boarding":
        return {
          color: "bg-green-500",
          text: "EMBARCANDO",
          icon: "✈️",
        };
      case "delayed":
        return {
          color: "bg-red-500",
          text: "RETRASADO",
          icon: "⚠️",
        };
      case "in_transit":
        return {
          color: "bg-blue-500",
          text: "EN RUTA",
          icon: "🚌",
        };
      default:
        return {
          color: "bg-gray-500",
          text: "EN ESPERA",
          icon: "⏰",
        };
    }
  };

  const getTimeUntilDeparture = (departureTime: string): string => {
    const now = new Date();
    const departure = new Date(departureTime);
    const diff = departure.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (diff < 0) return "SALIÓ";
    if (hours > 0) return `En ${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `En ${minutes}m`;
    return "AHORA";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero-light dark:bg-gradient-hero-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-2xl text-muted-foreground">Cargando salidas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero-light dark:bg-gradient-hero-dark p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="relative mb-12 animate-fadeInDown">
          <div className="absolute top-0 right-0 z-10">
            <UniversalThemeToggle />
          </div>
          <div className="text-center">
            <h1 className="text-6xl font-bold mb-4 text-foreground">Salidas de Buses</h1>
            <p className="text-2xl text-muted-foreground">
              {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>
        </div>

        {/* Terminal Filter */}
        <div className="flex justify-center gap-4 mb-8 animate-fadeInUp">
          {["all", "Panamá", "David", "Santiago"].map((terminal) => (
            <button
              key={terminal}
              onClick={() => setSelectedTerminal(terminal)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                selectedTerminal === terminal
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-card border border-border hover:bg-muted"
              }`}
            >
              {terminal === "all" ? "Todos" : terminal}
            </button>
          ))}
        </div>

        {/* Departures Board */}
        <div className="bg-card/90 backdrop-blur-md border border-border rounded-2xl shadow-premium overflow-hidden animate-fadeInUp" style={{ animationDelay: "200ms" }}>
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-6 bg-primary/10 border-b border-border font-semibold text-sm uppercase">
            <div className="col-span-2">Hora</div>
            <div className="col-span-2">Destino</div>
            <div className="col-span-2">Bus</div>
            <div className="col-span-2">Puerta</div>
            <div className="col-span-2">Estado</div>
            <div className="col-span-2">Asientos</div>
          </div>

          {/* Departures List */}
          <div className="divide-y divide-border">
            {trips.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-xl text-muted-foreground">No hay salidas programadas</p>
              </div>
            ) : (
              trips.map((trip, index) => {
                const statusConfig = getStatusConfig(trip.status);
                const timeUntil = getTimeUntilDeparture(trip.departureTime);
                const occupancy = ((trip.totalSeats - trip.availableSeats) / trip.totalSeats) * 100;

                return (
                  <div
                    key={trip.id}
                    className="grid grid-cols-12 gap-4 p-6 hover:bg-muted/50 transition-colors animate-fadeInUp"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="col-span-2">
                      <div className="text-2xl font-bold">{format(new Date(trip.departureTime), "HH:mm")}</div>
                      <div className="text-sm text-muted-foreground">{timeUntil}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="font-semibold text-lg">{trip.route.destination}</div>
                      <div className="text-sm text-muted-foreground">{trip.route.origin}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="font-medium">{trip.bus.plateNumber}</div>
                      <div className="text-xs text-muted-foreground capitalize">{trip.bus.busClass}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-2xl font-bold text-primary">{trip.gate || "—"}</div>
                    </div>
                    <div className="col-span-2">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm font-semibold ${statusConfig.color}`}>
                        <span>{statusConfig.icon}</span>
                        <span>{statusConfig.text}</span>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              occupancy > 90 ? "bg-destructive" : occupancy > 70 ? "bg-warning" : "bg-success"
                            }`}
                            style={{ width: `${occupancy}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold whitespace-nowrap">
                          {trip.availableSeats}/{trip.totalSeats}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground animate-fadeInUp" style={{ animationDelay: "400ms" }}>
          <p>Actualizado: {format(new Date(), "HH:mm:ss")}</p>
        </div>
      </div>
    </div>
  );
}
