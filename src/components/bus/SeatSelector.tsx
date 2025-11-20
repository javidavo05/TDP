"use client";

import { useState, useEffect } from "react";

interface Seat {
  id: string;
  number: string;
  x: number;
  y: number;
  type: "single" | "double" | "aisle";
  row: number;
  column: number;
  isAvailable: boolean;
  isSelected?: boolean;
  isLocked?: boolean;
}

interface SeatSelectorProps {
  seats: Seat[];
  selectedSeatId?: string | null;
  onSeatSelect: (seatId: string) => void;
  lockedSeats?: string[];
  className?: string;
}

export function SeatSelector({
  seats,
  selectedSeatId,
  onSeatSelect,
  lockedSeats = [],
  className = "",
}: SeatSelectorProps) {
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);

  if (!seats || seats.length === 0) {
    return (
      <div className={`flex items-center justify-center p-12 bg-muted rounded-lg ${className}`}>
        <p className="text-muted-foreground">No hay asientos disponibles</p>
      </div>
    );
  }

  // Calculate canvas dimensions
  const maxX = Math.max(...seats.map((s) => s.x)) + 100;
  const maxY = Math.max(...seats.map((s) => s.y)) + 100;
  const scale = Math.min(800 / maxX, 600 / maxY, 1);

  const getSeatColor = (seat: Seat) => {
    if (seat.id === selectedSeatId) return "bg-primary text-primary-foreground";
    if (lockedSeats.includes(seat.id) || seat.isLocked) return "bg-destructive/50 text-destructive-foreground cursor-not-allowed";
    if (!seat.isAvailable) return "bg-muted text-muted-foreground cursor-not-allowed";
    if (seat.id === hoveredSeat) return "bg-primary/70 text-primary-foreground";
    return "bg-card border border-border hover:border-primary cursor-pointer";
  };

  const getSeatSize = (seat: Seat) => {
    if (seat.type === "double") return "w-16 h-12";
    if (seat.type === "aisle") return "w-8 h-12";
    return "w-12 h-12";
  };

  return (
    <div className={`relative bg-muted/30 rounded-lg p-6 overflow-auto ${className}`}>
      <div
        className="relative mx-auto"
        style={{
          width: `${maxX * scale}px`,
          height: `${maxY * scale}px`,
          minHeight: "400px",
        }}
      >
        {/* Bus outline */}
        <div className="absolute inset-0 border-4 border-primary/20 rounded-lg bg-card/50" />

        {/* Seats */}
        {seats.map((seat) => {
          const isClickable = seat.isAvailable && !lockedSeats.includes(seat.id) && !seat.isLocked;
          
          return (
            <button
              key={seat.id}
              onClick={() => isClickable && onSeatSelect(seat.id)}
              onMouseEnter={() => isClickable && setHoveredSeat(seat.id)}
              onMouseLeave={() => setHoveredSeat(null)}
              disabled={!isClickable}
              className={`absolute ${getSeatSize(seat)} ${getSeatColor(seat)} rounded transition-all duration-200 flex items-center justify-center text-xs font-semibold shadow-md hover:shadow-lg hover:scale-110 disabled:hover:scale-100`}
              style={{
                left: `${seat.x * scale}px`,
                top: `${seat.y * scale}px`,
              }}
              title={`Asiento ${seat.number} - ${seat.isAvailable ? "Disponible" : "Ocupado"}`}
            >
              {seat.number}
            </button>
          );
        })}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-border">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary rounded" />
              <span>Seleccionado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-card border border-border rounded" />
              <span>Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-muted rounded" />
              <span>Ocupado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-destructive/50 rounded" />
              <span>Bloqueado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

