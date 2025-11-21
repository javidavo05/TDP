"use client";

import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { SeatLegend } from "./SeatLegend";
import { Button } from "@/components/ui/button";
// Seat type is defined inline in SeatMapEditor, using that structure
type Seat = {
  id: string;
  number: string;
  x: number;
  y: number;
  type: "single" | "double" | "aisle" | "disabled" | "extra_space" | "stair" | "bathroom";
  row: number;
  column: number;
  floor: number;
};

interface SeatSelectionModalProps {
  tripId: string;
  busId: string;
  availableSeats: number;
  totalSeats: number;
  onSelect: (seatId: string) => void;
  onClose: () => void;
  selectedSeatIds?: string[]; // Allow multiple selections
  allowMultiple?: boolean; // Enable multiple seat selection
}

interface SeatWithStatus extends Seat {
  status: "available" | "sold" | "selected" | "disabled";
  isAvailable: boolean;
}

export function SeatSelectionModal({
  tripId,
  busId,
  availableSeats,
  totalSeats,
  onSelect,
  onClose,
  selectedSeatIds = [],
  allowMultiple = true,
}: SeatSelectionModalProps) {
  const [seats, setSeats] = useState<SeatWithStatus[]>([]);
  const [internalSelectedSeatIds, setInternalSelectedSeatIds] = useState<string[]>(selectedSeatIds);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync with external selectedSeatIds prop
  useEffect(() => {
    setInternalSelectedSeatIds(selectedSeatIds);
  }, [selectedSeatIds]);

  useEffect(() => {
    fetchSeats();
  }, [tripId]);

  const fetchSeats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/public/trips/${tripId}/seats`);
      if (!response.ok) {
        throw new Error("Error al cargar asientos");
      }
      const data = await response.json();
      
      // Transform seats to include status
      const seatsWithStatus: SeatWithStatus[] = data.seats.map((seat: Seat) => {
        const isSold = data.occupiedSeatIds.includes(seat.id);
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

  // Helper function to determine if a seat type is selectable
  const isSeatTypeSelectable = (type: string): boolean => {
    // Exclude bathroom, stair, aisle - these are not selectable
    return type !== "bathroom" && type !== "stair" && type !== "aisle";
  };

  const handleSeatClick = (seatId: string) => {
    const seat = seats.find((s) => s.id === seatId);
    if (seat && seat.isAvailable && isSeatTypeSelectable(seat.type)) {
      if (allowMultiple) {
        // Toggle selection
        const newSelected = internalSelectedSeatIds.includes(seatId)
          ? internalSelectedSeatIds.filter((id) => id !== seatId)
          : [...internalSelectedSeatIds, seatId];
        setInternalSelectedSeatIds(newSelected);
        // Notify parent of each selection change
        onSelect(seatId);
      } else {
        // Single selection mode
        setInternalSelectedSeatIds([seatId]);
        onSelect(seatId);
      }
    }
  };

  const handleConfirm = () => {
    // Modal will close, selections are already synced
    onClose();
  };

  // Calculate canvas dimensions
  const maxX = seats.length > 0 ? Math.max(...seats.map((s) => s.x)) + 100 : 800;
  const maxY = seats.length > 0 ? Math.max(...seats.map((s) => s.y)) + 100 : 600;
  const scale = Math.min(1, 1000 / maxX, 700 / maxY);

  const getSeatColor = (seat: SeatWithStatus): string => {
    if (internalSelectedSeatIds.includes(seat.id)) {
      return "bg-blue-500 text-white ring-4 ring-blue-300";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold">Seleccionar Asiento</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Cupo disponible: {availableSeats} / {totalSeats} asientos
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    const isSelectable = isSeatTypeSelectable(seat.type);
                    const isClickable = isSelectable && seat.isAvailable && seat.status !== "sold";
                    
                    return (
                      <button
                        key={seat.id}
                        onClick={() => isClickable && handleSeatClick(seat.id)}
                        disabled={!isClickable}
                        className={`absolute ${getSeatSize(seat)} ${getSeatColor(seat)} rounded transition-all duration-200 flex items-center justify-center text-xs font-semibold shadow-md hover:shadow-lg hover:scale-110 disabled:hover:scale-100 disabled:cursor-not-allowed`}
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

          {/* Legend and Info */}
          <div className="space-y-4">
            <SeatLegend />
            
            {internalSelectedSeatIds.length > 0 && (
              <div className="bg-primary/10 border-2 border-primary rounded-xl p-4">
                <p className="text-sm font-semibold mb-2">
                  {allowMultiple ? "Asientos Seleccionados:" : "Asiento Seleccionado:"}
                </p>
                <div className="space-y-2 mb-4">
                  {internalSelectedSeatIds.map((seatId) => {
                    const seat = seats.find((s) => s.id === seatId);
                    return (
                      <p key={seatId} className="text-xl font-bold text-primary">
                        {seat?.number || "N/A"}
                      </p>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  {internalSelectedSeatIds.length} {internalSelectedSeatIds.length === 1 ? "asiento seleccionado" : "asientos seleccionados"}
                </p>
                <Button
                  onClick={handleConfirm}
                  className="w-full"
                  size="lg"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Confirmar Selección
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

