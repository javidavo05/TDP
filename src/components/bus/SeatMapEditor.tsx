"use client";

import { useState, useRef, useEffect } from "react";

interface Seat {
  id: string;
  number: string;
  x: number;
  y: number;
  type: "single" | "double" | "aisle";
  row: number;
  column: number;
}

interface SeatMapEditorProps {
  initialSeats?: Seat[];
  onSeatsChange: (seats: Seat[]) => void;
  className?: string;
}

export function SeatMapEditor({ initialSeats = [], onSeatsChange, className = "" }: SeatMapEditorProps) {
  const [seats, setSeats] = useState<Seat[]>(initialSeats);
  const [selectedSeatType, setSelectedSeatType] = useState<"single" | "double" | "aisle">("single");
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onSeatsChange(seats);
  }, [seats, onSeatsChange]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || dragging) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newSeat: Seat = {
      id: `seat-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      number: `${String.fromCharCode(65 + Math.floor(seats.length / 4))}${(seats.length % 4) + 1}`,
      x: x - 25,
      y: y - 25,
      type: selectedSeatType,
      row: Math.floor(seats.length / 4),
      column: seats.length % 4,
    };

    setSeats([...seats, newSeat]);
  };

  const handleSeatDragStart = (seatId: string, e: React.MouseEvent) => {
    const seat = seats.find((s) => s.id === seatId);
    if (!seat) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDragging(seatId);
    setDragOffset({
      x: e.clientX - rect.left - seat.x,
      y: e.clientY - rect.top - seat.y,
    });
  };

  const handleSeatDrag = (e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;

    setSeats((prev) =>
      prev.map((seat) =>
        seat.id === dragging ? { ...seat, x: Math.max(0, x), y: Math.max(0, y) } : seat
      )
    );
  };

  const handleSeatDragEnd = () => {
    setDragging(null);
  };

  const deleteSeat = (seatId: string) => {
    setSeats((prev) => prev.filter((s) => s.id !== seatId));
  };

  const getSeatSize = (type: string) => {
    if (type === "double") return "w-16 h-12";
    if (type === "aisle") return "w-8 h-12";
    return "w-12 h-12";
  };

  const getSeatColor = (type: string) => {
    if (type === "double") return "bg-blue-500";
    if (type === "aisle") return "bg-gray-400";
    return "bg-primary";
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Tipo de Asiento:</span>
          {(["single", "double", "aisle"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedSeatType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedSeatType === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {type === "single" ? "Individual" : type === "double" ? "Doble" : "Pasillo"}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setSeats([])}
          className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90"
        >
          Limpiar Todo
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleSeatDrag}
        onMouseUp={handleSeatDragEnd}
        onMouseLeave={handleSeatDragEnd}
        className="relative bg-muted/30 border-2 border-dashed border-border rounded-lg p-8 min-h-[600px] cursor-crosshair"
      >
        {/* Bus outline */}
        <div className="absolute inset-4 border-4 border-primary/20 rounded-lg bg-card/50" />

        {/* Instructions */}
        {seats.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-lg mb-2">Haz clic para agregar asientos</p>
              <p className="text-sm">Arrastra para mover • Haz clic derecho para eliminar</p>
            </div>
          </div>
        )}

        {/* Seats */}
        {seats.map((seat) => (
          <div
            key={seat.id}
            draggable={false}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleSeatDragStart(seat.id, e);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              deleteSeat(seat.id);
            }}
            className={`absolute ${getSeatSize(seat.type)} ${getSeatColor(seat.type)} rounded transition-all cursor-move hover:scale-110 hover:shadow-lg flex items-center justify-center text-white text-xs font-semibold ${
              dragging === seat.id ? "z-50" : "z-10"
            }`}
            style={{
              left: `${seat.x}px`,
              top: `${seat.y}px`,
            }}
            title={`${seat.number} - ${seat.type} (Click derecho para eliminar)`}
          >
            {seat.number}
          </div>
        ))}
      </div>

      {/* Seat List */}
      {seats.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Asientos Creados ({seats.length})</h3>
          <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
            {seats.map((seat) => (
              <div
                key={seat.id}
                className="p-2 bg-muted rounded text-xs text-center"
              >
                {seat.number}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

