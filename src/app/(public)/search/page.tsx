"use client";

import { useState, useEffect } from "react";
import { TERMINALS } from "@/lib/constants";
import { useTripSync } from "@/hooks/useTripSync";

export default function SearchPage() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);

  // Subscribe to realtime changes using the sync hook
  useTripSync({
    onTripCreated: () => {
      // Refresh search results when trips are created
      if (origin && destination && date) {
        handleSearch({ preventDefault: () => {} } as React.FormEvent);
      }
    },
    onTripUpdated: () => {
      // Refresh search results when trips are updated
      if (origin && destination && date) {
        handleSearch({ preventDefault: () => {} } as React.FormEvent);
      }
    },
    onTicketCreated: () => {
      // Refresh to update availability
      if (origin && destination && date) {
        handleSearch({ preventDefault: () => {} } as React.FormEvent);
      }
    },
    enabled: !!date && trips.length > 0, // Only subscribe if we have results
  });

  const handleSearch = async (e: React.FormEvent | { preventDefault: () => void }) => {
    if (e && 'preventDefault' in e) {
      e.preventDefault();
    }
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (origin) params.append("origin", origin);
      if (destination) params.append("destination", destination);
      if (date) params.append("date", date);

      const response = await fetch(`/api/public/trips?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setTrips(data.data || []);
      } else {
        console.error("Error searching trips:", data.error);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Buscar Viajes</h1>

        <form onSubmit={handleSearch} className="bg-card p-6 rounded-lg shadow-md mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Origen</label>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Seleccione origen</option>
                {TERMINALS.map((terminal) => (
                  <option key={terminal} value={terminal}>
                    {terminal}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Destino</label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Seleccione destino</option>
                {TERMINALS.filter((t) => t !== origin).map((terminal) => (
                  <option key={terminal} value={terminal}>
                    {terminal}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 border rounded"
                required
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full md:w-auto px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Buscando..." : "Buscar Viajes"}
          </button>
        </form>

        {trips.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Resultados</h2>
            {trips.map((trip) => (
              <div key={trip.id} className="bg-card p-4 rounded-lg shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">
                      {new Date(trip.departureTime).toLocaleString("es-PA")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Asientos disponibles: {trip.availableSeats} / {trip.totalSeats}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">${trip.price.toFixed(2)}</p>
                    <button className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded text-sm">
                      Seleccionar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

