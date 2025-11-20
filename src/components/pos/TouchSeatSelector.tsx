"use client";

import { useState } from "react";
import { TouchButton } from "./TouchButton";

interface Seat {
  id: string;
  number: string;
  x: number;
  y: number;
  type: "single" | "double" | "aisle";
  row: number;
  column: number;
  isAvailable: boolean;
}

interface TouchSeatSelectorProps {
  seats: Seat[];
  selectedSeatId: string | null;
  onSeatSelect: (seatId: string) => void;
}

export function TouchSeatSelector({
  seats,
  selectedSeatId,
  onSeatSelect,
}: TouchSeatSelectorProps) {
  // Group seats by row
  const seatsByRow = seats.reduce((acc, seat) => {
    if (!acc[seat.row]) {
      acc[seat.row] = [];
    }
    acc[seat.row].push(seat);
    return acc;
  }, {} as Record<number, Seat[]>);

  const rows = Object.keys(seatsByRow)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {/* Seat Grid */}
      <div className="bg-muted/30 rounded-xl p-6 space-y-4">
        {rows.map((row) => (
          <div key={row} className="flex items-center gap-2 justify-center">
            <div className="w-12 text-center text-sm font-semibold text-muted-foreground">
              {row}
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {seatsByRow[row]
                .sort((a, b) => a.column - b.column)
                .map((seat) => {
                  const isSelected = selectedSeatId === seat.id;
                  const isUnavailable = !seat.isAvailable;

                  return (
                    <button
                      key={seat.id}
                      onClick={() => !isUnavailable && onSeatSelect(seat.id)}
                      disabled={isUnavailable}
                      className={`
                        w-16 h-16 rounded-lg font-bold text-lg
                        transition-all duration-200 active:scale-95
                        disabled:opacity-30 disabled:cursor-not-allowed
                        ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-lg scale-110 ring-4 ring-primary/50"
                            : isUnavailable
                            ? "bg-destructive/20 text-destructive/50 border-2 border-destructive/30"
                            : "bg-card text-foreground border-2 border-border hover:border-primary hover:bg-primary/10"
                        }
                      `}
                    >
                      {seat.number}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-card border-2 border-border" />
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary" />
          <span>Seleccionado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-destructive/20 border-2 border-destructive/30" />
          <span>Ocupado</span>
        </div>
      </div>
    </div>
  );
}
