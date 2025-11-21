"use client";

import { useState, useEffect } from "react";
import { SeatLegend } from "./SeatLegend";
import { Seat } from "@/domain/entities/Seat";

interface SeatSelectorViewProps {
  tripId: string;
  busId: string;
  availableSeats: number;
  totalSeats: number;
  onSelect: (seatId: string) => void;
  selectedSeatId?: string | null; // External selected seat ID (for display only)
  className?: string;
}

interface SeatWithStatus extends Seat {
  status: "available" | "sold" | "selected" | "disabled";
  isAvailable: boolean;
}

export function SeatSelectorView({
  tripId,
  busId,
  availableSeats,
  totalSeats,
  onSelect,
  selectedSeatId: externalSelectedSeatId = null,
  className = "",
}: SeatSelectorViewProps) {
  const [seats, setSeats] = useState<SeatWithStatus[]>([]);
  const [internalSelectedSeatId, setInternalSelectedSeatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use external selected seat ID if provided, otherwise use internal state
  // Always prioritize external selected seat ID when it's provided (even if it's an empty string, treat null/undefined as not provided)
  const selectedSeatId = externalSelectedSeatId !== null && externalSelectedSeatId !== undefined 
    ? externalSelectedSeatId 
    : internalSelectedSeatId;

  useEffect(() => {
    fetchSeats();
  }, [tripId]);

  // Update when external selected seat ID changes
  useEffect(() => {
    if (externalSelectedSeatId !== null && externalSelectedSeatId !== undefined) {
      // External selection takes priority - clear internal selection
      setInternalSelectedSeatId(null);
    }
  }, [externalSelectedSeatId]);

  const fetchSeats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/public/trips/${tripId}/seats`);
      if (!response.ok) {
        throw new Error("Error al cargar asientos");
      }
      const data = await response.json();
      
      // Transform seats to include status
      const seatsWithStatus: SeatWithStatus[] = (data.seats || []).map((seat: Seat) => {
        const occupiedSeatIds = data.occupiedSeatIds || [];
        const isSold = occupiedSeatIds.includes(seat.id);
        return {
          ...seat,
          status: seat.type === "disabled" 
            ? "disabled" 
            : isSold 
            ? "sold" 
            : "available",
          isAvailable: !isSold && seat.type !== "disabled",
        };
      });
      
      setSeats(seatsWithStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleSeatClick = (seatId: string) => {
    const seat = seats.find((s) => s.id === seatId);
    if (seat && seat.isAvailable) {
      // Only allow interaction if no external selected seat ID is provided (view-only mode)
      if (externalSelectedSeatId === null) {
        setInternalSelectedSeatId(seatId);
        onSelect(seatId);
      }
    }
  };

  // Calculate canvas dimensions
  const maxX = seats.length > 0 ? Math.max(...seats.map((s) => s.x)) + 100 : 800;
  const maxY = seats.length > 0 ? Math.max(...seats.map((s) => s.y)) + 100 : 600;
  const scale = Math.min(1, 1000 / maxX, 700 / maxY);

  const getSeatColor = (seat: SeatWithStatus): string => {
    // Check if this seat is selected (prioritize external selection)
    if (selectedSeatId && seat.id === selectedSeatId) {
      return "bg-blue-500 text-white ring-4 ring-blue-300 ring-offset-2";
    }
    if (seat.status === "sold") {
      return "bg-red-500 text-white cursor-not-allowed opacity-75";
    }
    if (seat.status === "disabled") {
      return "bg-yellow-500 text-white cursor-not-allowed";
    }
    if (seat.isAvailable) {
      return "bg-green-500 text-white hover:bg-green-600 cursor-pointer";
    }
    return "bg-gray-400 text-white cursor-not-allowed";
  };

  const getSeatSize = (seat: SeatWithStatus): string => {
    if (seat.type === "double") return "w-16 h-12";
    if (seat.type === "aisle") return "w-8 h-12";
    if (seat.type === "stair") return "w-10 h-12";
    return "w-12 h-12";
  };

  return (
    <div className={`w-full h-full flex flex-col ${className}`}>
      {/* Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-auto">
        {/* Seat Map */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <p className="text-muted-foreground">Cargando asientos...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-96">
              <p className="text-destructive">{error}</p>
            </div>
          ) : seats.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <p className="text-muted-foreground">No hay asientos disponibles</p>
            </div>
          ) : (
            <div className="bg-muted/30 rounded-lg p-6 overflow-auto">
              <div
                className="relative mx-auto border-4 border-primary/20 rounded-lg bg-card/50"
                style={{
                  width: `${maxX * scale}px`,
                  height: `${maxY * scale}px`,
                  minHeight: "500px",
                }}
              >
                {/* Bus outline */}
                <div className="absolute inset-0 border-2 border-primary/30 rounded-lg" />

                {/* Seats */}
                {seats.map((seat) => {
                  // If external selected seat ID is provided, disable all interactions (view-only mode)
                  const isViewOnly = externalSelectedSeatId !== null;
                  const isClickable = !isViewOnly && seat.isAvailable && seat.status !== "sold";
                  
                  return (
                    <button
                      key={seat.id}
                      onClick={() => isClickable && handleSeatClick(seat.id)}
                      disabled={!isClickable || isViewOnly}
                      className={`absolute ${getSeatSize(seat)} ${getSeatColor(seat)} rounded transition-all duration-200 flex items-center justify-center text-xs font-semibold shadow-md ${isViewOnly ? '' : 'hover:shadow-lg hover:scale-110'} disabled:hover:scale-100 disabled:cursor-not-allowed ${seat.id === selectedSeatId ? 'z-10 scale-110' : ''}`}
                      style={{
                        left: `${seat.x * scale}px`,
                        top: `${seat.y * scale}px`,
                      }}
                      title={`Asiento ${seat.number} - ${
                        seat.status === "sold"
                          ? "Vendido"
                          : seat.status === "disabled"
                          ? "Discapacidad"
                          : "Disponible"
                      }`}
                    >
                      {seat.number}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div>
          <SeatLegend />
        </div>
      </div>
    </div>
  );
}

