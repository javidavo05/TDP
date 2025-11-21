"use client";

import { useState, useEffect, useMemo } from "react";
import { ArrowUp, ArrowDown, Accessibility, Layers } from "lucide-react";

export type SeatStatus = "available" | "sold" | "selected" | "locked" | "disabled" | "extra_space" | "stair" | "aisle";

interface Seat {
  id: string;
  number: string;
  x: number;
  y: number;
  type: "single" | "double" | "aisle" | "disabled" | "extra_space" | "stair";
  row: number;
  column: number;
  floor?: number;
  status: SeatStatus;
  isAvailable: boolean;
  isSelected?: boolean;
  isLocked?: boolean;
  lockedBy?: string; // User/session ID that locked this seat
  lockedUntil?: Date; // When the lock expires
}

interface SeatSelectorProps {
  seats: Seat[];
  selectedSeatId?: string | null;
  onSeatSelect: (seatId: string) => void;
  lockedSeats?: string[];
  tripId: string;
  className?: string;
  showLegend?: boolean;
}

const SEAT_WIDTH = 48;
const SEAT_HEIGHT = 48;
const AISLE_WIDTH = 60;

export function SeatSelector({
  seats,
  selectedSeatId,
  onSeatSelect,
  lockedSeats = [],
  tripId,
  className = "",
  showLegend = true,
}: SeatSelectorProps) {
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);

  // Organize seats into rows for better visualization (ALBusSeatView style)
  const organizedSeats = useMemo(() => {
    // Group by approximate row (based on Y position)
    const rows: Seat[][] = [];
    const rowThreshold = SEAT_HEIGHT + 8;
    
    seats.forEach(seat => {
      const rowIndex = Math.floor(seat.y / rowThreshold);
      if (!rows[rowIndex]) rows[rowIndex] = [];
      rows[rowIndex].push(seat);
    });
    
    // Sort each row by X position
    rows.forEach(row => row.sort((a, b) => a.x - b.x));
    
    return rows.flat();
  }, [seats]);

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

  const getSeatColor = (seat: Seat): string => {
    // Priority order: selected > locked > sold > disabled > extra_space > stair > available
    if (seat.id === selectedSeatId) {
      return "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2";
    }
    if (lockedSeats.includes(seat.id) || seat.isLocked) {
      return "bg-yellow-500 text-yellow-foreground cursor-not-allowed opacity-75";
    }
    if (seat.status === "sold" || !seat.isAvailable) {
      return "bg-gray-500 text-gray-foreground cursor-not-allowed";
    }
    if (seat.status === "disabled") {
      return "bg-purple-500 text-purple-foreground";
    }
    if (seat.status === "extra_space") {
      return "bg-green-500 text-green-foreground";
    }
    if (seat.status === "stair") {
      return "bg-orange-500 text-orange-foreground cursor-not-allowed";
    }
    if (seat.status === "aisle") {
      return "bg-gray-400 text-gray-foreground cursor-not-allowed";
    }
    if (seat.id === hoveredSeat) {
      return "bg-primary/70 text-primary-foreground";
    }
    return "bg-green-500 text-white hover:bg-green-600 cursor-pointer";
  };

  const getSeatSize = (seat: Seat): string => {
    if (seat.type === "double") return "w-16 h-12";
    if (seat.type === "aisle") return "w-8 h-12";
    if (seat.type === "stair") return "w-10 h-12";
    return "w-12 h-12";
  };

  const getSeatIcon = (seat: Seat) => {
    if (seat.type === "disabled") return <Accessibility className="w-4 h-4" />;
    if (seat.type === "stair") return <Layers className="w-4 h-4" />;
    return null;
  };

  const isSeatClickable = (seat: Seat): boolean => {
    return (
      seat.isAvailable &&
      seat.status !== "sold" &&
      seat.status !== "stair" &&
      seat.status !== "aisle" &&
      !lockedSeats.includes(seat.id) &&
      !seat.isLocked
    );
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
        {/* Bus outline with central aisle (ALBusSeatView style) */}
        <div className="absolute inset-0 border-4 border-primary/20 rounded-lg bg-card/50">
          {/* Central aisle/hall */}
          <div 
            className="absolute top-0 bottom-0 left-1/2 transform -translate-x-1/2 border-l-2 border-r-2 border-dashed border-primary/30 bg-primary/5"
            style={{ width: `${AISLE_WIDTH * scale}px` }}
          >
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs text-primary/60 font-semibold rotate-90 whitespace-nowrap">
              PASILLO
            </div>
          </div>
        </div>

        {/* Front indicator */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex items-center gap-2 bg-primary/90 text-primary-foreground px-3 py-1 rounded-lg shadow-lg text-xs">
            <ArrowUp className="w-4 h-4" />
            <span className="font-bold">FRENTE</span>
            <ArrowUp className="w-4 h-4" />
          </div>
        </div>

        {/* Rear indicator */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex items-center gap-2 bg-muted/90 text-foreground px-3 py-1 rounded-lg shadow-lg border-2 border-border text-xs">
            <ArrowDown className="w-4 h-4" />
            <span className="font-bold">TRASERA</span>
            <ArrowDown className="w-4 h-4" />
          </div>
        </div>

        {/* Seats */}
        {organizedSeats.map((seat) => {
          const clickable = isSeatClickable(seat);
          const isSelected = seat.id === selectedSeatId;
          
          return (
            <button
              key={seat.id}
              onClick={() => clickable && onSeatSelect(seat.id)}
              onMouseEnter={() => clickable && setHoveredSeat(seat.id)}
              onMouseLeave={() => setHoveredSeat(null)}
              disabled={!clickable}
              className={`absolute ${getSeatSize(seat)} ${getSeatColor(seat)} rounded transition-all duration-200 flex items-center justify-center text-xs font-semibold shadow-md hover:shadow-lg hover:scale-110 disabled:hover:scale-100 disabled:cursor-not-allowed ${
                isSelected ? "animate-pulse" : ""
              }`}
              style={{
                left: `${seat.x * scale}px`,
                top: `${seat.y * scale}px`,
              }}
              title={`Asiento ${seat.number} - ${
                seat.status === "sold" ? "Vendido" :
                seat.status === "locked" ? "Reservado temporalmente" :
                seat.status === "selected" ? "Seleccionado" :
                seat.status === "disabled" ? "Discapacitados" :
                seat.status === "extra_space" ? "Espacio Extra" :
                seat.status === "stair" ? "Escalera" :
                "Disponible"
              }`}
            >
              {getSeatIcon(seat) || <span>{seat.number}</span>}
              {getSeatIcon(seat) && (
                <span className="absolute bottom-0 text-[8px] font-bold">{seat.number}</span>
              )}
            </button>
          );
        })}

        {/* Legend */}
        {showLegend && (
          <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-border z-30">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded" />
                <span>Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary rounded ring-2 ring-primary ring-offset-1" />
                <span>Seleccionado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-500 rounded" />
                <span>Vendido</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded" />
                <span>Reservado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded" />
                <span>Discapacitados</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded" />
                <span>Espacio Extra</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded" />
                <span>Escalera</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

