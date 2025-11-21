"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SeatSelector, SeatStatus } from "@/components/public/SeatSelector";

interface Seat {
  id: string;
  number: string;
  x: number;
  y: number;
  type: "single" | "double" | "aisle" | "disabled" | "extra_space" | "stair";
  row: number;
  column: number;
  status: SeatStatus;
  isAvailable: boolean;
}

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState<any>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchTrip();
      fetchSeats();
    }
  }, [params.id]);

  const fetchTrip = async () => {
    try {
      const response = await fetch(`/api/public/trips/${params.id}`);
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
      const response = await fetch(`/api/public/trips/${params.id}/seats`);
      const data = await response.json();
      if (response.ok) {
        // Transform seats to match SeatSelector format
        const transformedSeats: Seat[] = (data.seats || []).map((seat: any) => ({
          id: seat.id,
          number: seat.seat_number || seat.number || "",
          x: seat.position_x || seat.x || 0,
          y: seat.position_y || seat.y || 0,
          type: seat.seat_type || seat.type || "single",
          row: seat.row_number || seat.row || 0,
          column: seat.column_number || seat.column || 0,
          status: seat.type === "disabled" 
            ? "disabled" 
            : data.occupiedSeatIds?.includes(seat.id)
            ? "sold"
            : "available",
          isAvailable: seat.isAvailable !== false && !data.occupiedSeatIds?.includes(seat.id),
        }));
        setSeats(transformedSeats);
      }
    } catch (error) {
      console.error("Error fetching seats:", error);
    }
  };

  const handleSeatSelect = (seatId: string) => {
    setSelectedSeat(seatId);
  };

  const handleContinue = () => {
    if (selectedSeat && trip) {
      router.push(`/checkout?tripId=${trip.id}&seatId=${selectedSeat}`);
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link href="/search" className="text-primary mb-4 inline-block">
          ← Volver a búsqueda
        </Link>

        <h1 className="text-3xl font-bold mb-6">Seleccionar Asiento</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-card p-6 rounded-lg shadow-md mb-6">
              <h2 className="text-xl font-semibold mb-4">
                Mapa de Asientos - {trip.availableSeats} disponibles de {trip.totalSeats}
              </h2>
              {seats.length > 0 ? (
                <SeatSelector
                  seats={seats}
                  selectedSeatId={selectedSeat}
                  onSeatSelect={handleSeatSelect}
                  tripId={params.id as string}
                  showLegend={true}
                />
              ) : (
                <div className="bg-muted p-8 rounded-lg text-center">
                  <p className="text-muted-foreground">Cargando asientos...</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-card p-6 rounded-lg shadow-md sticky top-4">
              <h2 className="text-xl font-semibold mb-4">Resumen del Viaje</h2>
              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Salida</p>
                  <p className="font-semibold">
                    {new Date(trip.departureTime).toLocaleString("es-PA")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Asientos Disponibles</p>
                  <p className="font-semibold">
                    {trip.availableSeats} / {trip.totalSeats}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Precio</p>
                  <p className="text-2xl font-bold text-primary">${trip.price.toFixed(2)}</p>
                </div>
              </div>

              {selectedSeat && (
                <button
                  onClick={handleContinue}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold"
                >
                  Continuar al Pago
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

