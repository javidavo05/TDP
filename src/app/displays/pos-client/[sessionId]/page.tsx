"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function POSClientDisplayPage() {
  const params = useParams();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.sessionId) {
      fetchSession();
      // Poll for updates
      const interval = setInterval(fetchSession, 2000);
      return () => clearInterval(interval);
    }
  }, [params.sessionId]);

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/displays/seat-selection/${params.sessionId}`);
      const data = await response.json();
      if (response.ok) {
        setSession(data);
      }
    } catch (error) {
      console.error("Error fetching session:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="bg-card p-12 rounded-lg shadow-lg text-center">
          <h1 className="text-4xl font-bold mb-8">Tu Asiento Seleccionado</h1>
          
          {session?.selectedSeat ? (
            <>
              <div className="bg-primary/10 p-8 rounded-lg mb-8">
                <div className="text-6xl font-bold text-primary mb-4">
                  {session.selectedSeat.seatNumber || "A1"}
                </div>
                <p className="text-xl text-muted-foreground">Asiento</p>
              </div>

              {session.trip && (
                <div className="space-y-4 text-left">
                  <div>
                    <p className="text-sm text-muted-foreground">Viaje</p>
                    <p className="text-lg font-semibold">
                      {new Date(session.trip.departureTime).toLocaleString("es-PA")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Precio</p>
                    <p className="text-2xl font-bold text-primary">
                      ${session.trip.price?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12">
              <p className="text-xl text-muted-foreground">
                Esperando selección de asiento...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

