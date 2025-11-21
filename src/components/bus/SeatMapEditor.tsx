"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { X, ArrowUp, ArrowDown, ZoomIn, ZoomOut, RotateCcw, Accessibility, Layers, GripVertical, Bath, Settings, Move, Maximize2 } from "lucide-react";

type SeatType = "single" | "double" | "aisle" | "disabled" | "extra_space" | "stair" | "bathroom";
type BusElementType = "driver" | "frontDoor" | "rearDoor";

interface BusElement {
  id: string;
  type: BusElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  floor: number;
}

interface Seat {
  id: string;
  number: string;
  x: number;
  y: number;
  type: SeatType;
  row: number;
  column: number;
  floor: number; // 1 or 2 for two-story buses
}

type LayoutIcon = "front" | "rear" | "steering" | "floor1" | "floor2" | "stairs";

interface LayoutShape {
  id: string;
  type: "rectangle" | "path" | "icon";
  x: number;
  y: number;
  width?: number;
  height?: number;
  path?: { x: number; y: number }[];
  iconType?: LayoutIcon;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

interface SeatMapEditorProps {
  initialSeats?: Seat[];
  onSeatsChange: (seats: Seat[]) => void;
  initialLayout?: LayoutShape[];
  onLayoutChange?: (layout: LayoutShape[]) => void;
  className?: string;
}

const SNAP_GRID_SIZE = 20; // Grid size in pixels for snapping
const MIN_ZOOM = 0.25; // 25% - allows seeing full bus
const MAX_ZOOM = 2.0; // 200%
const ZOOM_STEP = 0.25;
// Bus dimensions - horizontal orientation (wider than tall) - Top view style
const BUS_LENGTH = 2000; // Length of the bus in pixels (horizontal, FRONT to BACK)
const BUS_WIDTH = 600; // Width of the bus in pixels (vertical, side to side)
const CANVAS_WIDTH = 2400; // Canvas width to accommodate bus + margins
const CANVAS_HEIGHT = 1600; // Canvas height to accommodate two floors stacked vertically
const SEAT_WIDTH = 32; // Smaller seats to fit more in the bus
const SEAT_HEIGHT = 24; // Smaller seats to fit more in the bus
const SEAT_MARGIN = 4; // Margin between seats
const AISLE_WIDTH = 60; // Width of central aisle/hall (vertical in top view)
const STAIR_WIDTH = 50; // Width of stairs
const STAIR_HEIGHT = 80; // Height of stairs
const FLOOR_OFFSET = 120; // Vertical offset between floors (spacing between Top and Bottom deck)

// Snap coordinate to nearest grid point
const snapToGrid = (value: number, gridSize: number = SNAP_GRID_SIZE): number => {
  return Math.round(value / gridSize) * gridSize;
};

export function SeatMapEditor({ 
  initialSeats = [], 
  onSeatsChange, 
  initialLayout = [],
  onLayoutChange,
  className = "" 
}: SeatMapEditorProps) {
  const [seats, setSeats] = useState<Seat[]>(
    initialSeats.map(s => ({ ...s, floor: s.floor || 1 }))
  );
  const [selectedSeatType, setSelectedSeatType] = useState<SeatType>("single");
  
  // Bus layout customization state
  const [busLength, setBusLength] = useState(BUS_LENGTH);
  const [busWidth, setBusWidth] = useState(BUS_WIDTH);
  const [showLayoutSettings, setShowLayoutSettings] = useState(false);
  
  // Bus elements (driver, doors) as editable elements
  const [busElements, setBusElements] = useState<BusElement[]>([
    { id: "driver-1", type: "driver", x: 2, y: 2, width: 96, height: 64, floor: 1 },
    { id: "frontDoor-1", type: "frontDoor", x: 112, y: 0, width: 64, height: 80, floor: 1 },
    { id: "rearDoor-1", type: "rearDoor", x: BUS_LENGTH - 80, y: 0, width: 64, height: 80, floor: 1 },
  ]);
  
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const [resizingElement, setResizingElement] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [editMode, setEditMode] = useState<"seats" | "elements">("seats");
  
  // Size multipliers for groups (1.0 = 100%, 1.5 = 150%, etc.)
  const [sizeMultipliers, setSizeMultipliers] = useState({
    driver: 1.0,
    doors: 1.0,
    stairs: 1.0,
    seats: 1.0,
  });
  const [svgTemplate, setSvgTemplate] = useState<string | null>(null);
  const [svgFile, setSvgFile] = useState<File | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<1 | 2>(1);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingSeatId, setEditingSeatId] = useState<string | null>(null);
  const [editingNumber, setEditingNumber] = useState<string>("");
  const [showGrid, setShowGrid] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [zoom, setZoom] = useState(0.5); // Start with zoom out to see more
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [layoutMode, setLayoutMode] = useState<"free" | "grid">("free"); // Free placement or grid layout
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onSeatsChange(seats);
  }, [seats, onSeatsChange]);

  useEffect(() => {
    if (editingSeatId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingSeatId]);

  // Generate next seat number (only numbers, sequential)
  const getNextSeatNumber = (): string => {
    const maxNumber = seats
      .map(s => {
        const num = parseInt(s.number);
        return isNaN(num) ? 0 : num;
      })
      .reduce((max, num) => Math.max(max, num), 0);
    return String(maxNumber + 1);
  };

  // Organize seats into rows for grid layout (ALBusSeatView style)
  const organizedSeats = useMemo(() => {
    if (layoutMode === "free") return seats.filter(s => s.floor === selectedFloor);
    
    const floorSeats = seats.filter(s => s.floor === selectedFloor);
    // Group by approximate row (based on Y position)
    const rows: Seat[][] = [];
    const rowThreshold = SEAT_HEIGHT + SEAT_MARGIN;
    
    floorSeats.forEach(seat => {
      const rowIndex = Math.floor(seat.y / rowThreshold);
      if (!rows[rowIndex]) rows[rowIndex] = [];
      rows[rowIndex].push(seat);
    });
    
    // Sort each row by X position
    rows.forEach(row => row.sort((a, b) => a.x - b.x));
    
    return rows.flat();
  }, [seats, selectedFloor, layoutMode]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  };

  const handleZoomReset = () => {
    setZoom(0.5);
    setPan({ x: 0, y: 0 });
  };

  const handlePanStart = (e: React.MouseEvent) => {
    if ((e.button === 1 || e.ctrlKey || e.metaKey) && !dragging && !draggingElement && !resizingElement) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handlePanMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    });
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  // Helper function to get canvas coordinates from mouse event
  const getCanvasCoordinates = (e: React.MouseEvent): { x: number; y: number } => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    // Coordinates relative to viewport
    const viewportX = e.clientX - rect.left;
    const viewportY = e.clientY - rect.top;
    // Apply inverse transform: first subtract pan, then divide by zoom
    // CSS transform is: translate(pan.x, pan.y) scale(zoom)
    // Inverse: (viewport - pan) / zoom
    const canvasX = (viewportX - pan.x) / zoom;
    const canvasY = (viewportY - pan.y) / zoom;
    return { x: canvasX, y: canvasY };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only handle clicks for seat creation in seats mode
    if (!canvasRef.current || dragging || draggingElement || editingSeatId || isPanning || editMode !== "seats") return;

    const { x: clickX, y: clickY } = getCanvasCoordinates(e);

    // Check if click is on an existing seat
    const clickedSeat = seats.find((seat) => {
      const seatWidth = getSeatWidth(seat.type);
      const seatHeight = SEAT_HEIGHT;
      return (
        clickX >= seat.x &&
        clickX <= seat.x + seatWidth &&
        clickY >= seat.y &&
        clickY <= seat.y + seatHeight &&
        seat.floor === selectedFloor
      );
    });

    if (clickedSeat) return;

    // Create new seat with snap
    let x = clickX - SEAT_WIDTH / 2;
    let y = clickY - SEAT_HEIGHT / 2;

    if (snapEnabled) {
      x = snapToGrid(x);
      y = snapToGrid(y);
    }

    // Calculate bus bounds (centered in canvas, horizontal orientation)
    const busLeft = (CANVAS_WIDTH - busLength) / 2;
    // For top deck (floor 2): position above center
    // For bottom deck (floor 1): position below center (or at center if no top deck)
    const baseBusTop = seats.some(s => s.floor === 2) 
      ? (CANVAS_HEIGHT - busWidth * 2 - FLOOR_OFFSET) / 2
      : (CANVAS_HEIGHT - busWidth) / 2;
    
    const floorOffset = selectedFloor === 2 ? 0 : (seats.some(s => s.floor === 2) ? busWidth + FLOOR_OFFSET : 0);
    const busTop = baseBusTop + floorOffset;
    const busRight = busLeft + busLength;
    const busBottom = busTop + busWidth;
    const adjustedBusTop = busTop;
    const adjustedBusBottom = busBottom;

    // Constrain seat placement within bus bounds (with margins for labels and markers)
    const marginLeft = 50; // Space for FRONT label and markers
    const marginRight = 50; // Space for BACK label and markers
    const marginTop = 40; // Space for deck label
    const marginBottom = 40; // Space for deck label
    const constrainedX = Math.max(busLeft + marginLeft, Math.min(x, busRight - getSeatWidth(selectedSeatType) - marginRight));
    const constrainedY = Math.max(adjustedBusTop + marginTop, Math.min(y, adjustedBusBottom - SEAT_HEIGHT - marginBottom));

    const newSeat: Seat = {
      id: `seat-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      number: getNextSeatNumber(),
      x: constrainedX,
      y: constrainedY,
      type: selectedSeatType,
      row: Math.floor(seats.length / 4),
      column: seats.length % 4,
      floor: selectedFloor,
    };

    setSeats([...seats, newSeat]);
  };

  const handleSeatDragStart = (seatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingSeatId || isPanning) return;

    const seat = seats.find((s) => s.id === seatId);
    if (!seat) return;

    const { x: mouseX, y: mouseY } = getCanvasCoordinates(e);
    setDragging(seatId);
    setDragOffset({
      x: mouseX - seat.x,
      y: mouseY - seat.y,
    });
  };

  const handleSeatDrag = (e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current || editingSeatId || isPanning) return;

    const { x: mouseX, y: mouseY } = getCanvasCoordinates(e);
    let x = mouseX - dragOffset.x;
    let y = mouseY - dragOffset.y;

    if (snapEnabled) {
      x = snapToGrid(x);
      y = snapToGrid(y);
    }

    // Calculate bus bounds for the seat's floor (horizontal orientation)
    const busLeft = (CANVAS_WIDTH - busLength) / 2;
    const baseBusTop = seats.some(s => s.floor === 2) 
      ? (CANVAS_HEIGHT - busWidth * 2 - FLOOR_OFFSET) / 2
      : (CANVAS_HEIGHT - busWidth) / 2;
    
    const seat = seats.find(s => s.id === dragging);
    const floorOffset = seat?.floor === 2 ? 0 : (seats.some(s => s.floor === 2) ? busWidth + FLOOR_OFFSET : 0);
    const busTop = baseBusTop + floorOffset;
    const busRight = busLeft + busLength;
    const busBottom = busTop + busWidth;
    const adjustedBusTop = busTop;
    const adjustedBusBottom = busBottom;

    // Constrain seat placement within bus bounds (with margins for labels and markers)
    const marginLeft = 50;
    const marginRight = 50;
    const marginTop = 40;
    const marginBottom = 40;
    
    setSeats((prev) =>
      prev.map((seat) =>
        seat.id === dragging
          ? {
              ...seat,
              x: Math.max(busLeft + marginLeft, Math.min(x, busRight - getSeatWidth(seat.type) - marginRight)),
              y: Math.max(adjustedBusTop + marginTop, Math.min(y, adjustedBusBottom - SEAT_HEIGHT - marginBottom)),
            }
          : seat
      )
    );
  };

  const handleSeatDragEnd = () => {
    setDragging(null);
  };

  // Element drag handlers
  const handleElementDragStart = (elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (editMode !== "elements" || editingSeatId || isPanning || resizingElement) return;

    const element = busElements.find((el) => el.id === elementId);
    if (!element || element.floor !== selectedFloor) return;

    const { x: mouseX, y: mouseY } = getCanvasCoordinates(e);
    setDraggingElement(elementId);
    setSelectedElement(elementId);
    setDragOffset({
      x: mouseX - element.x,
      y: mouseY - element.y,
    });
  };

  const handleElementDrag = (e: React.MouseEvent) => {
    if (!draggingElement || !canvasRef.current || editingSeatId || isPanning || resizingElement) return;

    const { x: mouseX, y: mouseY } = getCanvasCoordinates(e);
    let x = mouseX - dragOffset.x;
    let y = mouseY - dragOffset.y;

    if (snapEnabled) {
      x = snapToGrid(x);
      y = snapToGrid(y);
    }

    // Calculate bus bounds
    const busLeft = (CANVAS_WIDTH - busLength) / 2;
    const baseBusTop = seats.some(s => s.floor === 2) 
      ? (CANVAS_HEIGHT - busWidth * 2 - FLOOR_OFFSET) / 2
      : (CANVAS_HEIGHT - busWidth) / 2;
    const floorOffset = selectedFloor === 2 ? 0 : (seats.some(s => s.floor === 2) ? busWidth + FLOOR_OFFSET : 0);
    const busTop = baseBusTop + floorOffset;
    const busRight = busLeft + busLength;
    const busBottom = busTop + busWidth;

    const element = busElements.find(el => el.id === draggingElement);
    if (!element) return;

    // Get element base dimensions (without multipliers for calculations)
    const baseWidth = element.width;
    const baseHeight = element.height;

    // For doors, adjust Y calculation because they use translateY(-50%)
    // The stored Y is the center position, but we need to constrain the top edge
    let constrainedY = y;
    if (element.type === "frontDoor" || element.type === "rearDoor") {
      // Doors are centered vertically, so we need to account for half height
      // Allow more freedom - only constrain to keep door fully visible
      const minY = busTop + baseHeight / 2;
      const maxY = busBottom - baseHeight / 2;
      constrainedY = Math.max(minY, Math.min(y, maxY));
    } else {
      // Regular elements (driver, stairs) - allow free movement within bus bounds
      // Only constrain to keep element fully visible
      constrainedY = Math.max(busTop, Math.min(y, busBottom - baseHeight));
    }

    // Constrain X position - allow free movement within bus bounds
    const constrainedX = Math.max(busLeft, Math.min(x, busRight - baseWidth));

    setBusElements((prev) =>
      prev.map((el) =>
        el.id === draggingElement
          ? {
              ...el,
              x: constrainedX,
              y: constrainedY,
            }
          : el
      )
    );
  };

  const handleElementDragEnd = () => {
    setDraggingElement(null);
  };

  // Element resize handlers
  const handleElementResizeStart = (elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (editMode !== "elements" || draggingElement) return;

    const element = busElements.find((el) => el.id === elementId);
    if (!element || element.floor !== selectedFloor) return;

    const { x: mouseX, y: mouseY } = getCanvasCoordinates(e);
    setResizingElement(elementId);
    setSelectedElement(elementId);
    setResizeStart({
      x: mouseX,
      y: mouseY,
      width: element.width,
      height: element.height,
    });
  };

  const handleElementResize = (e: React.MouseEvent) => {
    if (!resizingElement || !canvasRef.current || isPanning) return;

    const { x: currentX, y: currentY } = getCanvasCoordinates(e);

    const element = busElements.find(el => el.id === resizingElement);
    if (!element) return;

    // Calculate delta from resize start position
    const deltaX = currentX - resizeStart.x;
    const deltaY = currentY - resizeStart.y;

    // Calculate new dimensions (maintain top-left corner position)
    let newWidth = Math.max(20, resizeStart.width + deltaX);
    let newHeight = Math.max(20, resizeStart.height + deltaY);

    if (snapEnabled) {
      newWidth = snapToGrid(newWidth);
      newHeight = snapToGrid(newHeight);
    }

    // Calculate bus bounds
    const busLeft = (CANVAS_WIDTH - busLength) / 2;
    const baseBusTop = seats.some(s => s.floor === 2) 
      ? (CANVAS_HEIGHT - busWidth * 2 - FLOOR_OFFSET) / 2
      : (CANVAS_HEIGHT - busWidth) / 2;
    const floorOffset = selectedFloor === 2 ? 0 : (seats.some(s => s.floor === 2) ? busWidth + FLOOR_OFFSET : 0);
    const busTop = baseBusTop + floorOffset;
    const busRight = busLeft + busLength;
    const busBottom = busTop + busWidth;

    // Constrain resize within bus bounds (keep element position fixed, only resize)
    // For doors, need to consider translateY(-50%)
    if (element.type === "frontDoor" || element.type === "rearDoor") {
      // Doors are centered, so we need to check both top and bottom edges
      const doorTop = element.y - newHeight / 2;
      const doorBottom = element.y + newHeight / 2;
      if (doorTop < busTop + 2) {
        newHeight = (element.y - busTop - 2) * 2;
      }
      if (doorBottom > busBottom - 2) {
        newHeight = (busBottom - 2 - element.y) * 2;
      }
    } else {
      // Regular elements - constrain normally
      if (element.x + newWidth > busRight - 2) {
        newWidth = busRight - element.x - 2;
      }
      if (element.y + newHeight > busBottom - 2) {
        newHeight = busBottom - element.y - 2;
      }
    }

    // Ensure minimum size
    newWidth = Math.max(20, newWidth);
    newHeight = Math.max(20, newHeight);

    setBusElements((prev) =>
      prev.map((el) =>
        el.id === resizingElement
          ? { ...el, width: newWidth, height: newHeight }
          : el
      )
    );
  };

  const handleElementResizeEnd = () => {
    setResizingElement(null);
  };

  const handleSeatDoubleClick = (seatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const seat = seats.find((s) => s.id === seatId);
    if (seat) {
      setEditingSeatId(seatId);
      setEditingNumber(seat.number);
    }
  };

  const handleNumberEditSubmit = () => {
    if (!editingSeatId) return;

    const newNumber = editingNumber.trim();
    if (!newNumber || isNaN(Number(newNumber))) {
      setEditingSeatId(null);
      setEditingNumber("");
      return;
    }

    const duplicate = seats.find(
      (s) => s.id !== editingSeatId && s.number === newNumber
    );
    if (duplicate) {
      alert("Este número de asiento ya existe. Por favor usa otro número.");
      return;
    }

    setSeats((prev) =>
      prev.map((seat) =>
        seat.id === editingSeatId ? { ...seat, number: newNumber } : seat
      )
    );

    setEditingSeatId(null);
    setEditingNumber("");
  };

  const handleNumberEditCancel = () => {
    setEditingSeatId(null);
    setEditingNumber("");
  };

  const deleteSeat = (seatId: string) => {
    setSeats((prev) => prev.filter((s) => s.id !== seatId));
  };

  const getSeatWidth = (type: SeatType): number => {
    const baseWidths: Record<SeatType, number> = {
      double: 48,
      aisle: 24,
      stair: 50,
      bathroom: 40,
      single: SEAT_WIDTH,
      disabled: SEAT_WIDTH,
      extra_space: SEAT_WIDTH,
    };
    const baseWidth = baseWidths[type] || SEAT_WIDTH;
    const multiplier = type === "stair" ? sizeMultipliers.stairs : sizeMultipliers.seats;
    return baseWidth * multiplier;
  };

  const getSeatSize = (type: SeatType): { width: string; height: string } => {
    const baseSizes: Record<SeatType, { w: number; h: number }> = {
      double: { w: 48, h: 24 },
      aisle: { w: 24, h: 24 },
      stair: { w: 50, h: 32 },
      bathroom: { w: 40, h: 32 },
      single: { w: SEAT_WIDTH, h: SEAT_HEIGHT },
      disabled: { w: SEAT_WIDTH, h: SEAT_HEIGHT },
      extra_space: { w: SEAT_WIDTH, h: SEAT_HEIGHT },
    };
    
    const base = baseSizes[type] || baseSizes.single;
    const multiplier = type === "stair" ? sizeMultipliers.stairs : sizeMultipliers.seats;
    
    return {
      width: `${base.w * multiplier}px`,
      height: `${base.h * multiplier}px`,
    };
  };

  const getSeatColor = (type: SeatType, floor: number) => {
    // Color scheme optimized for top view
    if (type === "double") return floor === 1 ? "bg-blue-600" : "bg-blue-700";
    if (type === "aisle") return "bg-gray-200 border border-gray-400";
    if (type === "disabled") return "bg-blue-400";
    if (type === "extra_space") return "bg-blue-500";
    if (type === "stair") return "bg-orange-500"; // Orange for stairs to match diagram
    if (type === "bathroom") return "bg-cyan-400"; // Cyan for bathroom
    return floor === 1 ? "bg-blue-600" : "bg-blue-700";
  };

  const getSeatIcon = (type: SeatType) => {
    if (type === "disabled") return <Accessibility className="w-3 h-3" />;
    if (type === "stair") return <Layers className="w-3 h-3" />;
    if (type === "bathroom") return <Bath className="w-3 h-3" />;
    return null;
  };

  const seatTypeLabels: Record<SeatType, string> = {
    single: "Individual",
    double: "Doble",
    aisle: "Pasillo",
    disabled: "Discapacitados",
    extra_space: "Espacio Extra",
    stair: "Escalera",
    bathroom: "Baño",
  };

  const seatsForCurrentFloor = seats.filter((s) => s.floor === selectedFloor);
  const seatsForOtherFloor = seats.filter((s) => s.floor !== selectedFloor);

  // Generate grid background pattern using CSS
  const gridBackgroundStyle = showGrid
    ? {
        backgroundImage: `
          linear-gradient(to right, rgba(0, 0, 0, 0.1) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: `${SNAP_GRID_SIZE * zoom}px ${SNAP_GRID_SIZE * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }
    : {};

  // Update rear door position when bus length changes
  useEffect(() => {
    setBusElements(prev => prev.map(el => {
      if (el.type === "rearDoor" && el.floor === selectedFloor) {
        return { ...el, x: busLength - el.width - 2 };
      }
      return el;
    }));
  }, [busLength, selectedFloor]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Layout Settings Toggle */}
      <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
        <h3 className="font-semibold">Configuración del Layout del Bus</h3>
        <button
          onClick={() => setShowLayoutSettings(!showLayoutSettings)}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            showLayoutSettings ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          <Settings className="w-4 h-4" />
          {showLayoutSettings ? "Ocultar Configuración" : "Mostrar Configuración"}
        </button>
      </div>

      {/* Layout Settings Panel */}
      {showLayoutSettings && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          <h4 className="font-semibold text-lg mb-4">Personalizar Dimensiones y Elementos del Bus</h4>
          
          {/* Bus Dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Longitud del Bus (px): {busLength}
              </label>
              <input
                type="range"
                min="1000"
                max="3000"
                step="50"
                value={busLength}
                onChange={(e) => setBusLength(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1000px</span>
                <span>3000px</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Ancho del Bus (px): {busWidth}
              </label>
              <input
                type="range"
                min="400"
                max="1000"
                step="50"
                value={busWidth}
                onChange={(e) => setBusWidth(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>400px</span>
                <span>1000px</span>
              </div>
            </div>
          </div>

          {/* Size Multipliers by Group */}
          <div className="border-t border-border pt-4">
            <h5 className="font-semibold mb-3">Tamaño de Elementos por Grupo</h5>
            <div className="space-y-4">
              {/* Driver Size */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Conductor: {Math.round(sizeMultipliers.driver * 100)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={sizeMultipliers.driver}
                  onChange={(e) => {
                    const multiplier = Number(e.target.value);
                    setSizeMultipliers(prev => ({ ...prev, driver: multiplier }));
                    // Update all driver elements
                    setBusElements(prev => prev.map(el => {
                      if (el.type === "driver") {
                        return {
                          ...el,
                          width: 96 * multiplier,
                          height: 64 * multiplier,
                        };
                      }
                      return el;
                    }));
                  }}
                  className="w-full"
                />
              </div>

              {/* Doors Size */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Puertas (Entrada/Salida): {Math.round(sizeMultipliers.doors * 100)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={sizeMultipliers.doors}
                  onChange={(e) => {
                    const multiplier = Number(e.target.value);
                    setSizeMultipliers(prev => ({ ...prev, doors: multiplier }));
                    // Update all door elements
                    setBusElements(prev => prev.map(el => {
                      if (el.type === "frontDoor" || el.type === "rearDoor") {
                        return {
                          ...el,
                          width: 64 * multiplier,
                          height: 80 * multiplier,
                        };
                      }
                      return el;
                    }));
                  }}
                  className="w-full"
                />
              </div>

              {/* Stairs Size */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Escaleras: {Math.round(sizeMultipliers.stairs * 100)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={sizeMultipliers.stairs}
                  onChange={(e) => {
                    const multiplier = Number(e.target.value);
                    setSizeMultipliers(prev => ({ ...prev, stairs: multiplier }));
                    // Update all stair seats
                    setSeats(prev => prev.map(seat => {
                      if (seat.type === "stair") {
                        return {
                          ...seat,
                          // Keep position but scale size visually
                        };
                      }
                      return seat;
                    }));
                  }}
                  className="w-full"
                />
              </div>

              {/* Seats Size */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Asientos: {Math.round(sizeMultipliers.seats * 100)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={sizeMultipliers.seats}
                  onChange={(e) => {
                    const multiplier = Number(e.target.value);
                    setSizeMultipliers(prev => ({ ...prev, seats: multiplier }));
                    // Seats size is handled in getSeatSize function
                  }}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> Usa el botón "Modo Elementos" en el toolbar para editar conductor y puertas directamente en el canvas. 
              Arrastra para mover y usa la esquina inferior derecha para redimensionar.
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Modo:</span>
          <button
            onClick={() => setEditMode("seats")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              editMode === "seats"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            Asientos
          </button>
          <button
            onClick={() => setEditMode("elements")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              editMode === "elements"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            Elementos
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Piso:</span>
          <button
            onClick={() => setSelectedFloor(1)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedFloor === 1
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            Piso 1
          </button>
          <button
            onClick={() => setSelectedFloor(2)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedFloor === 2
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            Piso 2
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Tipo:</span>
          {(["single", "double", "aisle", "disabled", "extra_space", "stair", "bathroom"] as SeatType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedSeatType(type)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                selectedSeatType === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {getSeatIcon(type)}
              {seatTypeLabels[type]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomReset}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-muted hover:bg-muted/80"
            title="Reset Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSnapEnabled(!snapEnabled)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              snapEnabled
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
            title="Activar/Desactivar Snap"
          >
            Snap {snapEnabled ? "ON" : "OFF"}
          </button>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showGrid
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
            title="Mostrar/Ocultar Grid"
          >
            Grid {showGrid ? "ON" : "OFF"}
          </button>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setSeats([])}
          className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90"
        >
          Limpiar Todo
        </button>
      </div>

      {/* Canvas Container with zoom and pan */}
      <div
        ref={containerRef}
        className="relative bg-muted/20 border-2 border-dashed border-border rounded-lg overflow-hidden"
        style={{ height: "800px" }}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
        onWheel={(e) => {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
          setZoom((prev) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta)));
        }}
      >
        {/* Canvas with transform */}
        <div
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={(e) => {
            if (editMode === "seats") {
              handleSeatDrag(e);
            }
            if (editMode === "elements") {
              handleElementDrag(e);
              handleElementResize(e);
            }
          }}
          onMouseUp={(e) => {
            if (editMode === "seats") {
              handleSeatDragEnd();
            }
            if (editMode === "elements") {
              handleElementDragEnd();
              handleElementResizeEnd();
            }
          }}
          onMouseLeave={(e) => {
            if (editMode === "seats") {
              handleSeatDragEnd();
            }
            if (editMode === "elements") {
              handleElementDragEnd();
              handleElementResizeEnd();
            }
          }}
          className="relative bg-muted/30 cursor-crosshair"
          style={{
            width: `${CANVAS_WIDTH}px`,
            height: `${CANVAS_HEIGHT}px`,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            ...gridBackgroundStyle,
          }}
        >
          {/* SVG Template Background */}
          {svgTemplate && (
            <div
              className="absolute pointer-events-none z-0"
              style={{
                left: `${(CANVAS_WIDTH - busLength) / 2}px`,
                top: `${(CANVAS_HEIGHT - busWidth) / 2}px`,
                width: `${busLength}px`,
                height: `${busWidth}px`,
              }}
              dangerouslySetInnerHTML={{ __html: svgTemplate }}
            />
          )}

          {/* SVG Template Background */}
          {svgTemplate && (
            <div
              className="absolute pointer-events-none z-0"
              style={{
                left: `${(CANVAS_WIDTH - busLength) / 2}px`,
                top: `${(CANVAS_HEIGHT - busWidth) / 2}px`,
                width: `${busLength}px`,
                height: `${busWidth}px`,
              }}
              dangerouslySetInnerHTML={{ __html: svgTemplate }}
            />
          )}

          {/* Bus Floor Layout - Top Deck (Floor 2) - Vista Superior Horizontal */}
          {seats.some(s => s.floor === 2) && (
            <div
              className={`absolute border-2 border-gray-400 rounded-lg bg-white ${
                selectedFloor === 2 ? "opacity-100 z-5" : "opacity-40 z-0"
              }`}
              style={{
                left: `${(CANVAS_WIDTH - busLength) / 2}px`,
                top: `${(CANVAS_HEIGHT - busWidth * 2 - FLOOR_OFFSET) / 2}px`,
                width: `${busLength}px`,
                height: `${busWidth}px`,
              }}
            >
              {/* Top Deck Label */}
              <div className="absolute -top-6 left-0 right-0 flex items-center justify-center">
                <div className="bg-gray-100 border border-gray-300 px-3 py-1 rounded text-xs font-semibold text-gray-700">
                  Top deck
                </div>
              </div>

              {/* FRONT Label - Left Side */}
              <div className="absolute top-1/2 -left-8 transform -translate-y-1/2 -rotate-90 flex items-center gap-1 bg-gray-100 border border-gray-300 px-2 py-1 rounded text-xs font-semibold text-gray-700 whitespace-nowrap">
                <ArrowUp className="w-3 h-3" />
                <span>FRONT</span>
              </div>

              {/* BACK Label - Right Side */}
              <div className="absolute top-1/2 -right-8 transform -translate-y-1/2 rotate-90 flex items-center gap-1 bg-gray-100 border border-gray-300 px-2 py-1 rounded text-xs font-semibold text-gray-700 whitespace-nowrap">
                <ArrowDown className="w-3 h-3" />
                <span>BACK</span>
              </div>

              {/* Corner Markers - Top Deck */}

              {/* Central Aisle - Horizontal orientation */}
              <div
                className="absolute top-1/2 left-0 right-0 transform -translate-y-1/2 border-t border-b border-dashed border-gray-400 bg-gray-100"
                style={{ height: `${AISLE_WIDTH}px` }}
              >
                {/* Aisle label */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[10px] text-gray-600 font-semibold whitespace-nowrap">
                  PASILLO
                </div>
              </div>

              {/* Stairs - Middle of the bus with diagonal pattern */}
              <div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-12 border-2 border-orange-500 rounded bg-orange-100 flex flex-col items-center justify-center z-10"
                style={{ 
                  backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(251, 146, 60, 0.3) 4px, rgba(251, 146, 60, 0.3) 8px)",
                }}
              >
                <Layers className="w-4 h-4 text-orange-700 z-10" />
                <div className="text-[10px] font-semibold text-orange-800 mt-1 text-center z-10">
                  ESCALERA
                </div>
              </div>

              {/* Side Windows - Top and Bottom */}
              <div className="absolute top-0 left-2 right-2 h-1 bg-gray-200" />
              <div className="absolute bottom-0 left-2 right-2 h-1 bg-gray-200" />
            </div>
          )}

          {/* Bus Floor Layout - Bottom Deck (Floor 1) - Vista Superior Horizontal */}
          <div
            className={`absolute border-2 border-gray-400 rounded-lg bg-white ${
              selectedFloor === 1 ? "opacity-100 z-5" : "opacity-40 z-0"
            }`}
            style={{
              left: `${(CANVAS_WIDTH - busLength) / 2}px`,
              top: `${(CANVAS_HEIGHT - busWidth) / 2 + (seats.some(s => s.floor === 2) ? busWidth + FLOOR_OFFSET : 0)}px`,
              width: `${busLength}px`,
              height: `${busWidth}px`,
            }}
          >
            {/* Bottom Deck Label */}
            <div className="absolute -top-6 left-0 right-0 flex items-center justify-center">
              <div className="bg-gray-100 border border-gray-300 px-3 py-1 rounded text-xs font-semibold text-gray-700">
                Bottom deck
              </div>
            </div>

            {/* FRONT Label - Left Side */}
            <div className="absolute top-1/2 -left-8 transform -translate-y-1/2 -rotate-90 flex items-center gap-1 bg-gray-100 border border-gray-300 px-2 py-1 rounded text-xs font-semibold text-gray-700 whitespace-nowrap">
              <ArrowUp className="w-3 h-3" />
              <span>FRONT</span>
            </div>

            {/* BACK Label - Right Side */}
            <div className="absolute top-1/2 -right-8 transform -translate-y-1/2 rotate-90 flex items-center gap-1 bg-gray-100 border border-gray-300 px-2 py-1 rounded text-xs font-semibold text-gray-700 whitespace-nowrap">
              <ArrowDown className="w-3 h-3" />
              <span>BACK</span>
            </div>


            {/* Bus Elements - Driver, Doors (Editable) */}
            {busElements
              .filter(el => el.floor === selectedFloor)
              .map((element) => {
                const isSelected = selectedElement === element.id;
                const isDragging = draggingElement === element.id;
                const isResizing = resizingElement === element.id;
                
                let bgColor = "bg-gray-100";
                let borderColor = "border-gray-400";
                let label = "";
                
                if (element.type === "driver") {
                  bgColor = "bg-gray-100";
                  borderColor = "border-gray-400";
                  label = "CONDUCTOR";
                } else if (element.type === "frontDoor") {
                  bgColor = "bg-gray-50";
                  borderColor = "border-dashed border-gray-400";
                  label = "ENTRADA";
                } else if (element.type === "rearDoor") {
                  bgColor = "bg-gray-50";
                  borderColor = "border-dashed border-gray-400";
                  label = "SALIDA";
                }
                
                return (
                  <div
                    key={element.id}
                    className={`absolute ${bgColor} ${borderColor} rounded flex items-center justify-center group ${
                      editMode === "elements" ? "cursor-move" : ""
                    } ${isSelected ? "ring-2 ring-primary" : ""} ${
                      isDragging || isResizing ? "z-50" : "z-20"
                    }`}
                    style={{
                      left: `${element.x}px`,
                      top: element.type === "frontDoor" || element.type === "rearDoor" 
                        ? `${element.y + busWidth / 2}px`
                        : `${element.y}px`,
                      width: `${element.width * (element.type === "driver" ? sizeMultipliers.driver : sizeMultipliers.doors)}px`,
                      height: `${element.height * (element.type === "driver" ? sizeMultipliers.driver : sizeMultipliers.doors)}px`,
                      transform: element.type === "frontDoor" || element.type === "rearDoor"
                        ? "translateY(-50%)"
                        : "none",
                    }}
                    onMouseDown={(e) => {
                      if (editMode === "elements") {
                        handleElementDragStart(element.id, e);
                        setSelectedElement(element.id);
                      }
                    }}
                    onClick={(e) => {
                      if (editMode === "elements") {
                        e.stopPropagation();
                        setSelectedElement(element.id);
                      }
                    }}
                  >
                    <div className={`text-[10px] font-semibold text-gray-600 text-center ${
                      element.type === "driver" ? "rotate-90" : ""
                    } whitespace-nowrap`}>
                      {label}
                    </div>
                    
                    {/* Resize handle - bottom right corner */}
                    {editMode === "elements" && isSelected && (
                      <div
                        className="absolute bottom-0 right-0 w-4 h-4 bg-primary cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{
                          clipPath: "polygon(100% 0, 0 100%, 100% 100%)",
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleElementResizeStart(element.id, e);
                        }}
                        title="Arrastra para redimensionar"
                      />
                    )}
                    
                    {/* Selection indicator */}
                    {editMode === "elements" && isSelected && (
                      <div className="absolute -inset-1 border-2 border-primary border-dashed pointer-events-none" />
                    )}
                  </div>
                );
              })}

            {/* Central Aisle - Horizontal orientation */}
            <div
              className="absolute top-1/2 left-0 right-0 transform -translate-y-1/2 border-t border-b border-dashed border-gray-400 bg-gray-100"
              style={{ height: `${AISLE_WIDTH}px` }}
            >
              {/* Aisle label */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[10px] text-gray-600 font-semibold whitespace-nowrap">
                PASILLO
              </div>
            </div>

            {/* Stairs - Middle of the bus with diagonal pattern */}
            {seats.some(s => s.floor === 2) && (
              <div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-12 border-2 border-orange-500 rounded bg-orange-100 flex flex-col items-center justify-center z-10"
                style={{ 
                  backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(251, 146, 60, 0.3) 4px, rgba(251, 146, 60, 0.3) 8px)",
                }}
              >
                <Layers className="w-4 h-4 text-orange-700 z-10" />
                <div className="text-[10px] font-semibold text-orange-800 mt-1 text-center z-10">
                  ESCALERA
                </div>
              </div>
            )}

            {/* Side Windows - Top and Bottom */}
            <div className="absolute top-0 left-2 right-2 h-1 bg-gray-200" />
            <div className="absolute bottom-0 left-2 right-2 h-1 bg-gray-200" />

          </div>

          {/* Floor separator for two-story buses - Horizontal orientation */}
          {seatsForOtherFloor.length > 0 && (
            <div 
              className="absolute left-1/2 transform -translate-x-1/2 border-l-2 border-dashed border-primary/40 z-10"
              style={{
                top: `${(CANVAS_HEIGHT - busWidth * 2 - FLOOR_OFFSET) / 2 + busWidth}px`,
                height: `${FLOOR_OFFSET}px`,
              }}
            >
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -rotate-90 bg-background px-2 text-xs text-muted-foreground whitespace-nowrap">
                Separador de Pisos
              </div>
            </div>
          )}

          {/* Instructions */}
          {seatsForCurrentFloor.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center text-muted-foreground bg-background/80 p-4 rounded-lg">
                <p className="text-lg mb-2 font-semibold">Haz clic para agregar asientos en el Piso {selectedFloor}</p>
                <p className="text-sm">Arrastra para mover • Doble clic para editar número • Botón X para eliminar</p>
                <p className="text-sm mt-1">Ctrl/Cmd + Arrastrar para mover el canvas • Rueda del mouse para zoom</p>
                {snapEnabled && (
                  <p className="text-xs mt-2 text-primary">Snap activado: Los asientos se alinearán automáticamente</p>
                )}
              </div>
            </div>
          )}

          {/* Seats for current floor */}
          {seatsForCurrentFloor.map((seat) => (
            <div
              key={seat.id}
              draggable={false}
              onMouseDown={(e) => handleSeatDragStart(seat.id, e)}
              onDoubleClick={(e) => handleSeatDoubleClick(seat.id, e)}
              onContextMenu={(e) => {
                e.preventDefault();
                deleteSeat(seat.id);
              }}
              className={`absolute ${getSeatColor(seat.type, seat.floor)} rounded transition-all cursor-move hover:scale-110 hover:shadow-lg flex items-center justify-center text-white text-xs font-semibold group ${
                dragging === seat.id ? "z-50" : "z-10"
              } ${seat.type === "stair" ? "border-2 border-orange-700" : ""} ${seat.type === "bathroom" ? "border-2 border-cyan-600" : ""}`}
              style={{
                left: `${seat.x}px`,
                top: `${seat.y}px`,
                ...getSeatSize(seat.type),
                ...(seat.type === "stair" ? {
                  backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255, 255, 255, 0.2) 4px, rgba(255, 255, 255, 0.2) 8px)",
                } : {}),
              }}
              title={`Asiento ${seat.number} - ${seatTypeLabels[seat.type]} - Piso ${seat.floor} (Doble clic para editar, click derecho o X para eliminar)`}
            >
              {editingSeatId === seat.id ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editingNumber}
                  onChange={(e) => setEditingNumber(e.target.value)}
                  onBlur={handleNumberEditSubmit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleNumberEditSubmit();
                    } else if (e.key === "Escape") {
                      handleNumberEditCancel();
                    }
                  }}
                  className="w-full h-full text-center bg-white text-black rounded font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  {getSeatIcon(seat.type) || <span>{seat.number}</span>}
                  {getSeatIcon(seat.type) && (
                    <span className="absolute bottom-0 text-[8px] font-bold">{seat.number}</span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSeat(seat.id);
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                    title="Eliminar asiento"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          ))}

          {/* Seats for other floor (dimmed) */}
          {seatsForOtherFloor.map((seat) => (
            <div
              key={seat.id}
              className={`absolute ${getSeatColor(seat.type, seat.floor)} rounded opacity-30 pointer-events-none ${seat.type === "stair" ? "border-2 border-orange-700" : ""} ${seat.type === "bathroom" ? "border-2 border-cyan-600" : ""}`}
              style={{
                left: `${seat.x}px`,
                top: `${seat.y}px`,
                ...getSeatSize(seat.type),
                ...(seat.type === "stair" ? {
                  backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255, 255, 255, 0.2) 4px, rgba(255, 255, 255, 0.2) 8px)",
                } : {}),
              }}
              title={`Asiento ${seat.number} - Piso ${seat.floor}`}
            >
              {getSeatIcon(seat.type) || <span className="text-xs">{seat.number}</span>}
            </div>
          ))}
        </div>

        {/* Pan hint */}
        {zoom < 1 && (
          <div className="absolute bottom-4 right-4 bg-background/90 border border-border rounded-lg p-2 text-xs text-muted-foreground z-30">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4" />
              <span>Ctrl/Cmd + Arrastrar para mover</span>
            </div>
          </div>
        )}
      </div>

      {/* Seat List */}
      {seats.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Asientos Creados ({seats.length})</h3>
          <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
            {seats.map((seat) => (
              <div
                key={seat.id}
                className={`p-2 bg-muted rounded text-xs text-center ${
                  seat.floor === selectedFloor ? "ring-2 ring-primary" : ""
                }`}
              >
                {seat.number} ({seatTypeLabels[seat.type]}, P{seat.floor})
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
