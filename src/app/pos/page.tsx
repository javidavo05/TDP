"use client";

import { useState } from "react";

export default function POSPage() {
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [displaySessionId, setDisplaySessionId] = useState<string | null>(null);

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
        // Open client display in new window or update existing
        window.open(`/displays/pos-client/${data.sessionId}`, "_blank");
      }
    } catch (error) {
      console.error("Error creating display session:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Terminal POS</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-card p-6 rounded-lg shadow-md mb-6">
              <h2 className="text-xl font-semibold mb-4">Seleccionar Viaje</h2>
              <p className="text-muted-foreground">Búsqueda de viajes...</p>
            </div>

            <div className="bg-card p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Mapa de Asientos</h2>
              <div className="bg-muted p-8 rounded-lg text-center">
                <p className="text-muted-foreground">
                  Selector de asientos interactivo
                </p>
                {selectedSeat && (
                  <button
                    onClick={createDisplaySession}
                    className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                  >
                    Mostrar en Pantalla Cliente
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-card p-6 rounded-lg shadow-md sticky top-4">
              <h2 className="text-xl font-semibold mb-4">Resumen de Venta</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Asiento Seleccionado</p>
                  <p className="font-semibold">{selectedSeat || "Ninguno"}</p>
                </div>
                {displaySessionId && (
                  <div className="mt-4 p-3 bg-muted rounded">
                    <p className="text-sm text-muted-foreground">Sesión de Pantalla</p>
                    <p className="font-mono text-xs">{displaySessionId}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

