"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Accessibility, Layers } from "lucide-react";

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
  lockedBy?: string;
  lockedUntil?: Date;
}

interface BusElement {
  id: string;
  type: "frontDoor" | "rearDoor";
  x: number;
  y: number;
  width: number;
  height: number;
  floor: number;
}

interface FreeSpaceElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  floor: number;
}

interface SeatSelectorProps {
  seats: Seat[];
  selectedSeatId?: string | null;
  selectedSeatIds?: string[]; // Support multiple selections
  onSeatSelect: (seatId: string) => void;
  lockedSeats?: string[];
  tripId: string;
  className?: string;
  showLegend?: boolean;
  busElements?: BusElement[];
  freeSpaces?: FreeSpaceElement[];
}

// Canvas dimensions match SVG viewBox
const CANVAS_WIDTH = 4200;
const CANVAS_HEIGHT = 2550;
const SEAT_WIDTH = 180;
const SEAT_HEIGHT = 134;

// Size multipliers (same as builder)
const sizeMultipliers = {
  doors: 1,
  stairs: 1,
  seats: 1,
};

const getSeatWidth = (type: string): number => {
  if (type === "double") return SEAT_WIDTH * 1.5;
  if (type === "aisle") return SEAT_WIDTH * 0.3;
  // Stair uses same base size as builder: 280 (140*2) * multiplier
  if (type === "stair") return 280 * sizeMultipliers.stairs;
  // Bathroom uses same base size as builder: 224 (112*2) * multiplier
  if (type === "bathroom") return 224 * sizeMultipliers.seats;
  return SEAT_WIDTH;
};

const getSeatSize = (seat: Seat): { width: number; height: number } => {
  // Use same base sizes as builder
  if (seat.type === "stair") {
    return {
      width: 280 * sizeMultipliers.stairs,
      height: 180 * sizeMultipliers.stairs, // 90*2 = 180
    };
  }
  if (seat.type === "bathroom") {
    return {
      width: 224 * sizeMultipliers.seats, // 112*2 = 224
      height: 180 * sizeMultipliers.seats, // 90*2 = 180
    };
  }
  return {
    width: getSeatWidth(seat.type),
    height: SEAT_HEIGHT,
  };
};

export function SeatSelector({
  seats,
  selectedSeatId,
  selectedSeatIds = [],
  onSeatSelect,
  lockedSeats = [],
  tripId,
  className = "",
  showLegend = true,
  busElements = [],
  freeSpaces = [],
}: SeatSelectorProps) {
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);
  
  // Combine selectedSeatId and selectedSeatIds for display
  const allSelectedSeatIds = selectedSeatIds.length > 0 
    ? selectedSeatIds 
    : selectedSeatId 
    ? [selectedSeatId] 
    : [];
  const [svgTemplate, setSvgTemplate] = useState<string>("");
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Calculate canvas size to fit viewport
  useEffect(() => {
    if (!containerRef.current) return;
    
    const calculateCanvasSize = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      if (containerWidth === 0 || containerHeight === 0) return;
      
      // Canvas logical dimensions (matches SVG viewBox: 4200x2550)
      const canvasAspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
      
      // Calculate maximum size that fits in viewport
      let maxWidth = containerWidth;
      let maxHeight = maxWidth / canvasAspectRatio;
      
      if (maxHeight > containerHeight) {
        maxHeight = containerHeight;
        maxWidth = maxHeight * canvasAspectRatio;
      }
      
      setCanvasSize({ width: maxWidth, height: maxHeight });
    };
    
    calculateCanvasSize();
    
    const resizeObserver = new ResizeObserver(calculateCanvasSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    window.addEventListener('resize', calculateCanvasSize);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculateCanvasSize);
    };
  }, []);

  // Load SVG on mount
  useEffect(() => {
    fetch('/SVG_layout/layout bus.svg')
      .then(res => res.text())
      .then(svg => {
        let svgContent = svg.replace(/<\?xml[^>]*\?>/, '').replace(/<!DOCTYPE[^>]*>/, '').trim();
        
        svgContent = svgContent.replace(
          /width="[^"]*"/,
          'width="100%"'
        ).replace(
          /height="[^"]*"/,
          'height="100%"'
        );
        
        if (!svgContent.includes('preserveAspectRatio')) {
          svgContent = svgContent.replace(
            /<svg([^>]*)>/,
            `<svg$1 preserveAspectRatio="xMidYMid meet">`
          );
        }
        
        setSvgTemplate(svgContent);
      })
      .catch(err => {
        console.error('Error loading SVG:', err);
      });
  }, []);

  // Coordinate conversion functions
  const getScaleX = () => canvasSize.width / CANVAS_WIDTH;
  const getScaleY = () => canvasSize.height / CANVAS_HEIGHT;
  
  const logicalToPhysicalX = (logicalX: number) => logicalX * getScaleX();
  const logicalToPhysicalY = (logicalY: number) => logicalY * getScaleY();
  const logicalToPhysicalWidth = (logicalWidth: number) => logicalWidth * getScaleX();
  const logicalToPhysicalHeight = (logicalHeight: number) => logicalHeight * getScaleY();

  const getSeatColor = (seat: Seat): string => {
    // Non-selectable elements: neutral colors, no hover, part of design
    if (seat.type === "stair") {
      return "bg-gray-300 text-gray-600 cursor-default pointer-events-none";
    }
    if (seat.type === "bathroom") {
      return "bg-gray-300 text-gray-600 cursor-default pointer-events-none";
    }
    if (seat.type === "aisle") {
      return "bg-gray-200 text-gray-500 cursor-default pointer-events-none";
    }
    
    // Selectable elements
    if (allSelectedSeatIds.includes(seat.id)) {
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
    if (seat.id === hoveredSeat) {
      return "bg-primary/70 text-primary-foreground";
    }
    return "bg-green-500 text-white hover:bg-green-600 cursor-pointer";
  };

  const getSeatIcon = (seat: Seat) => {
    if (seat.type === "disabled") return <Accessibility className="w-4 h-4" />;
    if (seat.type === "stair") return <Layers className="w-4 h-4" />;
    return null;
  };

  // Helper function to determine if a seat type is selectable
  const isSeatTypeSelectable = (type: string): boolean => {
    // Exclude bathroom, stair, aisle - these are not selectable
    return type !== "bathroom" && type !== "stair" && type !== "aisle";
  };

  const isSeatClickable = (seat: Seat): boolean => {
    return (
      isSeatTypeSelectable(seat.type) &&
      seat.isAvailable &&
      seat.status !== "sold" &&
      seat.status !== "stair" &&
      seat.status !== "aisle" &&
      !lockedSeats.includes(seat.id) &&
      !seat.isLocked
    );
  };

  if (!seats || seats.length === 0) {
    return (
      <div className={`flex items-center justify-center p-12 bg-muted rounded-lg ${className}`}>
        <p className="text-muted-foreground">No hay asientos disponibles</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative bg-muted/30 rounded-lg p-6 overflow-auto flex items-center justify-center ${className}`}
      style={{ minHeight: '600px', width: '100%' }}
    >
      {/* SVG Background */}
      {svgTemplate && canvasSize.width > 0 && canvasSize.height > 0 && (
        <div
          className="absolute"
          style={{
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
            zIndex: 0,
          }}
          dangerouslySetInnerHTML={{ __html: svgTemplate }}
        />
      )}

      {/* Interactive Canvas */}
      <div
        ref={canvasRef}
        className="absolute"
        style={{
          width: `${canvasSize.width}px`,
          height: `${canvasSize.height}px`,
          zIndex: 10,
        }}
      >
        {/* Bus Elements - Doors */}
        {busElements.map((element) => {
          let label = "";
          
          if (element.type === "frontDoor") {
            label = "ENTRADA";
          } else if (element.type === "rearDoor") {
            label = "SALIDA";
          }
          
          return (
            <div
              key={element.id}
              className="absolute bg-gray-50 border-dashed border-gray-400 rounded flex items-center justify-center"
              style={{
                left: `${logicalToPhysicalX(element.x)}px`,
                top: `${logicalToPhysicalY(element.y)}px`,
                width: `${logicalToPhysicalWidth(element.width * sizeMultipliers.doors)}px`,
                height: `${logicalToPhysicalHeight(element.height * sizeMultipliers.doors)}px`,
                transform: "translateY(-50%)",
              }}
            >
              <div className="text-[10px] font-semibold text-gray-600 text-center whitespace-nowrap">
                {label}
              </div>
            </div>
          );
        })}

        {/* Free Space Elements */}
        {freeSpaces.map((freeSpace) => {
          return (
            <div
              key={freeSpace.id}
              className="absolute bg-transparent border-2 border-dashed border-gray-400 rounded"
              style={{
                left: `${logicalToPhysicalX(freeSpace.x)}px`,
                top: `${logicalToPhysicalY(freeSpace.y)}px`,
                width: `${logicalToPhysicalWidth(freeSpace.width)}px`,
                height: `${logicalToPhysicalHeight(freeSpace.height)}px`,
              }}
            />
          );
        })}

        {/* Seats */}
        {seats.map((seat) => {
          const clickable = isSeatClickable(seat);
          const isSelected = allSelectedSeatIds.includes(seat.id);
          const seatSize = getSeatSize(seat);
          
          return (
            <button
              key={seat.id}
              onClick={() => clickable && onSeatSelect(seat.id)}
              onMouseEnter={() => clickable && setHoveredSeat(seat.id)}
              onMouseLeave={() => setHoveredSeat(null)}
              disabled={!clickable}
              className={`absolute ${getSeatColor(seat)} rounded transition-all duration-200 flex items-center justify-center text-xs font-semibold ${
                clickable ? "shadow-md hover:shadow-lg hover:scale-110" : ""
              } disabled:hover:scale-100 disabled:cursor-not-allowed ${
                isSelected ? "animate-pulse" : ""
              }`}
              style={{
                left: `${logicalToPhysicalX(seat.x)}px`,
                top: `${logicalToPhysicalY(seat.y)}px`,
                width: `${logicalToPhysicalWidth(seatSize.width)}px`,
                height: `${logicalToPhysicalHeight(seatSize.height)}px`,
                ...(seat.type === "stair" ? {
                  backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255, 255, 255, 0.2) 4px, rgba(255, 255, 255, 0.2) 8px)",
                } : {}),
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
