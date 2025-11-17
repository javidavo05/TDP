"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/utils";

export default function DeparturesDisplayPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingTrips();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUpcomingTrips, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUpcomingTrips = async () => {
    try {
      const response = await fetch("/api/public/trips/upcoming");
      const data = await response.json();
      if (response.ok) {
        setTrips(data.trips || []);
      }
    } catch (error) {
      console.error("Error fetching upcoming trips:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "boarding":
        return "bg-green-500";
      case "delayed":
        return "bg-red-500";
      default:
        return "bg-blue-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "boarding":
        return "Embarcando";
      case "delayed":
        return "Retrasado";
      default:
        return "En Espera";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-2xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container mx-auto">
        <h1 className="text-5xl font-bold mb-8 text-center">Salidas de Buses</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="bg-card p-6 rounded-lg shadow-lg border-l-4 border-primary"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold mb-2">
                    {formatDateTime(trip.departureTime)}
                  </h3>
                  <p className="text-lg text-muted-foreground">
                    Terminal: {trip.route?.origin || "N/A"}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-white text-sm ${getStatusColor(
                    trip.status
                  )}`}
                >
                  {getStatusText(trip.status)}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Destino:</span>
                  <span className="font-semibold">{trip.route?.destination || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Asientos:</span>
                  <span className="font-semibold">
                    {trip.availableSeats} / {trip.totalSeats}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Precio:</span>
                  <span className="font-bold text-primary text-lg">
                    ${trip.price?.toFixed(2) || "0.00"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {trips.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">No hay salidas programadas</p>
          </div>
        )}
      </div>
    </div>
  );
}

