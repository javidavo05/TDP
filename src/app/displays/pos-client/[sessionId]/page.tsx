"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SeatSelector } from "@/components/bus/SeatSelector";
import { format } from "date-fns";

interface Session {
  id: string;
  selectedSeat: {
    id: string;
    seatNumber: string;
    x: number;
    y: number;
    type: string;
  };
  trip: {
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
        }>;
      };
    };
  };
}

export default function POSClientDisplayPage() {
  const params = useParams();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.sessionId) {
      fetchSession();
      // Poll for updates every 2 seconds
      const interval = setInterval(fetchSession, 2000);
      return () => clearInterval(interval);
    }
  }, [params.sessionId]);

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/displays/seat-selection/${params.sessionId}`);
      const data = await response.json();
      if (response.ok && data.session) {
        setSession(data.session);
      }
    } catch (error) {
      console.error("Error fetching session:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero-light dark:bg-gradient-hero-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-hero-light dark:bg-gradient-hero-dark flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Sesión no encontrada</p>
        </div>
      </div>
    );
  }

  const allSeats = session.trip.bus.seatMap.seats.map((seat) => ({
    id: seat.id,
    number: seat.number,
    x: seat.x,
    y: seat.y,
    type: (seat.type as "single" | "double" | "aisle") || "single",
    row: 0,
    column: 0,
    isAvailable: true,
  }));

  return (
    <div className="min-h-screen bg-gradient-hero-light dark:bg-gradient-hero-dark flex items-center justify-center p-8">
      <div className="max-w-6xl w-full animate-fadeIn">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 text-foreground">Tu Asiento Seleccionado</h1>
          <p className="text-xl text-muted-foreground">
            {session.trip.route.origin} → {session.trip.route.destination}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Seat Map */}
          <div className="bg-card/90 backdrop-blur-md border border-border rounded-2xl p-8 shadow-premium">
            <h2 className="text-2xl font-semibold mb-6 text-center">Vista del Bus</h2>
            <SeatSelector
              seats={allSeats}
              selectedSeatId={session.selectedSeat.id}
              onSeatSelect={() => {}}
              lockedSeats={[]}
              className="min-h-[500px]"
            />
          </div>

          {/* Seat Details */}
          <div className="space-y-6">
            {/* Selected Seat Highlight */}
            <div className="bg-card/90 backdrop-blur-md border border-border rounded-2xl p-8 shadow-premium text-center">
              <div className="mb-6">
                <div className="w-32 h-32 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4 animate-pulseGlow">
                  <span className="text-5xl font-bold text-primary">
                    {session.selectedSeat.seatNumber}
                  </span>
                </div>
                <p className="text-2xl font-semibold text-foreground">Asiento Seleccionado</p>
              </div>

              <div className="space-y-4 text-left">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Salida</p>
                  <p className="text-lg font-semibold">
                    {format(new Date(session.trip.departureTime), "EEEE, d 'de' MMMM 'a las' HH:mm", { locale: require("date-fns/locale/es") })}
                  </p>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Llegada Estimada</p>
                  <p className="text-lg font-semibold">
                    {format(new Date(session.trip.arrivalTime), "HH:mm")}
                  </p>
                </div>

                <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary">
                  <p className="text-sm text-muted-foreground mb-1">Precio Total</p>
                  <p className="text-4xl font-bold text-primary">
                    ${session.trip.price.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">USD</p>
                </div>
              </div>
            </div>

            {/* Confirmation Message */}
            <div className="bg-success/10 border border-success/20 rounded-xl p-6 text-center">
              <svg className="w-12 h-12 text-success mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-semibold text-success mb-2">Asiento Confirmado</p>
              <p className="text-sm text-muted-foreground">
                Este es tu asiento. Procede al pago para completar tu reserva.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
