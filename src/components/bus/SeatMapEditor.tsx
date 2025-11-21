"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { X, ArrowUp, ArrowDown, Accessibility, Layers, GripVertical, Bath, Settings, Move, Maximize2, Ruler, MousePointer2, Undo2 } from "lucide-react";

type SeatType = "single" | "double" | "aisle" | "disabled" | "extra_space" | "stair" | "bathroom" | "free_space";
type BusElementType = "frontDoor" | "rearDoor";

interface BusElement {
  id: string;
  type: BusElementType;
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
// Zoom removed - SVG always fits viewport
// Bus dimensions - horizontal orientation (wider than tall) - Top view style
const BUS_LENGTH = 2000; // Length of the bus in pixels (horizontal, FRONT to BACK)
const BUS_WIDTH = 600; // Width of the bus in pixels (vertical, side to side)
// Canvas dimensions match SVG viewBox
const CANVAS_WIDTH = 4200; // SVG viewBox width
const CANVAS_HEIGHT = 2550; // SVG viewBox height
const SEAT_WIDTH = 180; // Base seat width (90 * 2 = 180)
const SEAT_HEIGHT = 134; // Base seat height (67 * 2 = 134)
const SEAT_MARGIN = 4; // Margin between seats
const AISLE_WIDTH = 60; // Width of central aisle/hall (vertical in top view)
const STAIR_WIDTH = 50; // Width of stairs
const STAIR_HEIGHT = 80; // Height of stairs
const FLOOR_OFFSET = 120; // Vertical offset between floors (spacing between Top and Bottom deck)

// Snap coordinate to nearest grid point
const snapToGrid = (value: number, gridSize: number = SNAP_GRID_SIZE): number => {
  return Math.round(value / gridSize) * gridSize;
};

// Snap to nearest guide (horizontal or vertical ruler)
const snapToGuides = (value: number, guides: number[], threshold: number = 10): number | null => {
  for (const guideValue of guides) {
    if (Math.abs(value - guideValue) < threshold) {
      return guideValue;
    }
  }
  return null;
};

// Enhanced snap function that considers both grid and guides (horizontal and vertical)
const snapValue = (
  value: number, 
  horizontalGuides: number[], 
  verticalGuides: number[],
  snapToGridEnabled: boolean, 
  snapToGuidesEnabled: boolean,
  isHorizontal: boolean
): number => {
  const guides = isHorizontal ? horizontalGuides : verticalGuides;
  // First try to snap to guides (higher priority)
  if (snapToGuidesEnabled && guides.length > 0) {
    const snappedToGuide = snapToGuides(value, guides);
    if (snappedToGuide !== null) {
      return snappedToGuide;
    }
  }
  // Then snap to grid
  if (snapToGridEnabled) {
    return snapToGrid(value);
  }
  return value;
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
  
  // Canvas size customization state
  const [canvasScale, setCanvasScale] = useState(100); // Percentage scale (50-200%)
  const [showLayoutSettings, setShowLayoutSettings] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 }); // Actual rendered size
  
  // Bus elements (doors) as editable elements - now optional, user can add them
  const [busElements, setBusElements] = useState<BusElement[]>([]);

  // Free space elements (rectangles)
  const [freeSpaces, setFreeSpaces] = useState<FreeSpaceElement[]>([]);
  const [creatingFreeSpace, setCreatingFreeSpace] = useState(false);
  const [freeSpaceStart, setFreeSpaceStart] = useState<{ x: number; y: number } | null>(null);
  const [freeSpaceCurrent, setFreeSpaceCurrent] = useState<{ x: number; y: number } | null>(null);
  const [selectedFreeSpace, setSelectedFreeSpace] = useState<string | null>(null);
  const [draggingFreeSpace, setDraggingFreeSpace] = useState<string | null>(null);
  const [resizingFreeSpace, setResizingFreeSpace] = useState<string | null>(null);
  
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const [resizingElement, setResizingElement] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null); // 'n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'
  const [editMode, setEditMode] = useState<"seats" | "elements">("seats");
  
  // History for undo functionality
  interface HistoryState {
    seats: Seat[];
    busElements: BusElement[];
    freeSpaces: FreeSpaceElement[];
  }
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedElementType, setSelectedElementType] = useState<"frontDoor" | "rearDoor" | null>(null);
  
  // Size multipliers for groups (1.0 = 100%, 1.5 = 150%, etc.)
  const [sizeMultipliers, setSizeMultipliers] = useState({
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
  // No zoom - SVG always fits viewport
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [layoutMode, setLayoutMode] = useState<"free" | "grid">("free"); // Free placement or grid layout
  
  // Horizontal and vertical guides (rulers) for perfect alignment
  const [horizontalGuides, setHorizontalGuides] = useState<number[]>([]);
  const [verticalGuides, setVerticalGuides] = useState<number[]>([]);
  const [addingGuide, setAddingGuide] = useState<"horizontal" | "vertical" | false>(false);
  
  // Multi-selection state
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [multiDragOffset, setMultiDragOffset] = useState<{ x: number; y: number } | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
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
      const canvasAspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT; // 4200/2550 = 1.647...
      
      // Calculate maximum size that fits in viewport
      let maxWidth = containerWidth;
      let maxHeight = maxWidth / canvasAspectRatio;
      
      if (maxHeight > containerHeight) {
        maxHeight = containerHeight;
        maxWidth = maxHeight * canvasAspectRatio;
      }
      
      // Apply scale percentage
      const scaledWidth = (maxWidth * canvasScale) / 100;
      const scaledHeight = (maxHeight * canvasScale) / 100;
      
      setCanvasSize({ width: scaledWidth, height: scaledHeight });
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
  }, [canvasScale]);

  // Load SVG on mount - keep original viewBox
  useEffect(() => {
    fetch('/SVG_layout/layout bus.svg')
      .then(res => res.text())
      .then(svg => {
        // Remove XML declaration and DOCTYPE, keep the full SVG
        let svgContent = svg.replace(/<\?xml[^>]*\?>/, '').replace(/<!DOCTYPE[^>]*>/, '').trim();
        
        // Keep the original viewBox from the SVG (0 0 4200 2550)
        // Don't modify it - the SVG already has the correct viewBox
        // Just ensure width and height are set to 100% for scaling
        svgContent = svgContent.replace(
          /width="[^"]*"/,
          'width="100%"'
        ).replace(
          /height="[^"]*"/,
          'height="100%"'
        );
        
        // Ensure preserveAspectRatio is set for proper scaling
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

  // Delete element function
  const deleteElement = (elementId: string, type: 'seat' | 'busElement' | 'freeSpace') => {
    if (type === 'seat') {
      setSeats(prev => prev.filter(s => s.id !== elementId));
    } else if (type === 'busElement') {
      setBusElements(prev => prev.filter(el => el.id !== elementId));
      if (selectedElement === elementId) {
        setSelectedElement(null);
      }
    } else if (type === 'freeSpace') {
      setFreeSpaces(prev => prev.filter(fs => fs.id !== elementId));
      if (selectedFreeSpace === elementId) {
        setSelectedFreeSpace(null);
      }
    }
    saveToHistory();
  };

  // Handle keyboard delete and arrow key movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keyboard events if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Delete selected items
      if ((e.key === 'Delete' || e.key === 'Backspace') && !editingSeatId) {
        if (selectedElement) {
          deleteElement(selectedElement, 'busElement');
        } else if (selectedFreeSpace) {
          deleteElement(selectedFreeSpace, 'freeSpace');
        } else if (selectedSeats.size > 0) {
          // Delete all selected seats
          setSeats(prev => prev.filter(s => !selectedSeats.has(s.id)));
          setSelectedSeats(new Set());
          saveToHistory();
        }
        return;
      }

      // Undo with Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Arrow key movement for selected items
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !editingSeatId) {
        // Don't prevent default if user is typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        
        e.preventDefault();
        
        // Determine movement direction and amount
        // Normal: 5px per keypress, Shift: 20px, Ctrl/Cmd: 1px (fine adjustment)
        let step = 5;
        if (e.shiftKey) {
          step = 20; // Large movement with Shift
        } else if (e.ctrlKey || e.metaKey) {
          step = 1; // Fine adjustment with Ctrl/Cmd
        }
        
        let deltaX = 0;
        let deltaY = 0;

        if (e.key === 'ArrowUp') deltaY = -step;
        else if (e.key === 'ArrowDown') deltaY = step;
        else if (e.key === 'ArrowLeft') deltaX = -step;
        else if (e.key === 'ArrowRight') deltaX = step;

        // Move selected seats
        if (selectedSeats.size > 0) {
          setSeats((prev) =>
            prev.map((seat) => {
              if (selectedSeats.has(seat.id) && seat.floor === selectedFloor) {
                let newX = seat.x + deltaX;
                let newY = seat.y + deltaY;

                // Apply snap if enabled
                if (snapEnabled) {
                  newX = snapValue(newX, horizontalGuides, verticalGuides, snapEnabled, true, false);
                  newY = snapValue(newY, horizontalGuides, verticalGuides, snapEnabled, true, true);
                }

                const margin = 20;
                return {
                  ...seat,
                  x: Math.max(margin, Math.min(newX, CANVAS_WIDTH - getSeatWidth(seat.type) - margin)),
                  y: Math.max(margin, Math.min(newY, CANVAS_HEIGHT - SEAT_HEIGHT - margin)),
                };
              }
              return seat;
            })
          );
        }

        // Move selected bus element
        if (selectedElement) {
          const element = busElements.find(el => el.id === selectedElement);
          if (element && element.floor === selectedFloor) {
            let newX = element.x + deltaX;
            let newY = element.y + deltaY;

            // Apply snap if enabled
            if (snapEnabled) {
              newX = snapValue(newX, horizontalGuides, verticalGuides, snapEnabled, true, false);
              newY = snapValue(newY, horizontalGuides, verticalGuides, snapEnabled, true, true);
            }

            const margin = 20;
            setBusElements((prev) =>
              prev.map((el) =>
                el.id === selectedElement
                  ? {
                      ...el,
                      x: Math.max(margin, Math.min(newX, CANVAS_WIDTH - el.width - margin)),
                      y: Math.max(margin, Math.min(newY, CANVAS_HEIGHT - el.height - margin)),
                    }
                  : el
              )
            );
          }
        }

        // Move selected free space
        if (selectedFreeSpace) {
          const freeSpace = freeSpaces.find(fs => fs.id === selectedFreeSpace);
          if (freeSpace && freeSpace.floor === selectedFloor) {
            let newX = freeSpace.x + deltaX;
            let newY = freeSpace.y + deltaY;

            // Apply snap if enabled
            if (snapEnabled) {
              newX = snapValue(newX, horizontalGuides, verticalGuides, snapEnabled, true, false);
              newY = snapValue(newY, horizontalGuides, verticalGuides, snapEnabled, true, true);
            }

            const margin = 20;
            setFreeSpaces((prev) =>
              prev.map((fs) =>
                fs.id === selectedFreeSpace
                  ? {
                      ...fs,
                      x: Math.max(margin, Math.min(newX, CANVAS_WIDTH - fs.width - margin)),
                      y: Math.max(margin, Math.min(newY, CANVAS_HEIGHT - fs.height - margin)),
                    }
                  : fs
              )
            );
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, selectedFreeSpace, editingSeatId, selectedSeats, selectedFloor, snapEnabled, horizontalGuides, verticalGuides, busElements, freeSpaces]);

  // Free space creation handlers
  const handleFreeSpaceMouseDown = (e: React.MouseEvent) => {
    if (selectedSeatType !== "free_space" || editMode !== "seats" || isPanning) return;
    e.stopPropagation();
    const { x, y } = getCanvasCoordinates(e);
    setCreatingFreeSpace(true);
    setFreeSpaceStart({ x, y });
    setFreeSpaceCurrent({ x, y });
  };

  const handleFreeSpaceMouseMove = (e: React.MouseEvent) => {
    if (!creatingFreeSpace || !freeSpaceStart) return;
    const { x, y } = getCanvasCoordinates(e);
    setFreeSpaceCurrent({ x, y });
  };

  const handleFreeSpaceMouseUp = (e: React.MouseEvent) => {
    if (!creatingFreeSpace || !freeSpaceStart || !freeSpaceCurrent) return;
    
    const startX = Math.min(freeSpaceStart.x, freeSpaceCurrent.x);
    const startY = Math.min(freeSpaceStart.y, freeSpaceCurrent.y);
    const width = Math.abs(freeSpaceCurrent.x - freeSpaceStart.x);
    const height = Math.abs(freeSpaceCurrent.y - freeSpaceStart.y);

    if (width > 10 && height > 10) {
      const newFreeSpace: FreeSpaceElement = {
        id: `freespace-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        x: snapEnabled ? snapToGrid(startX) : startX,
        y: snapEnabled ? snapToGrid(startY) : startY,
        width: snapEnabled ? snapToGrid(width) : width,
        height: snapEnabled ? snapToGrid(height) : height,
        floor: selectedFloor,
      };
      setFreeSpaces(prev => [...prev, newFreeSpace]);
      saveToHistory();
    }

    setCreatingFreeSpace(false);
    setFreeSpaceStart(null);
    setFreeSpaceCurrent(null);
  };

  // Free space drag handlers
  const handleFreeSpaceDragStart = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editMode !== "elements" || isPanning || resizingFreeSpace) return;
    const freeSpace = freeSpaces.find(fs => fs.id === id);
    if (!freeSpace || freeSpace.floor !== selectedFloor) return;
    const { x: mouseX, y: mouseY } = getCanvasCoordinates(e);
    setDraggingFreeSpace(id);
    setSelectedFreeSpace(id);
    setDragOffset({
      x: mouseX - freeSpace.x,
      y: mouseY - freeSpace.y,
    });
  };

  const handleFreeSpaceDrag = (e: React.MouseEvent) => {
    if (!draggingFreeSpace || !canvasRef.current || isPanning) return;
    const { x: mouseX, y: mouseY } = getCanvasCoordinates(e);
    let x = mouseX - dragOffset.x;
    let y = mouseY - dragOffset.y;

    if (snapEnabled) {
      x = snapToGrid(x);
      y = snapToGrid(y);
    }

    setFreeSpaces(prev =>
      prev.map(fs =>
        fs.id === draggingFreeSpace
          ? { ...fs, x, y }
          : fs
      )
    );
  };

  const handleFreeSpaceDragEnd = () => {
    if (draggingFreeSpace) {
      saveToHistory();
    }
    setDraggingFreeSpace(null);
  };

  // Free space resize handlers with multi-directional resize
  const handleFreeSpaceResizeStart = (id: string, handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (editMode !== "elements" || draggingFreeSpace) return;
    const freeSpace = freeSpaces.find(fs => fs.id === id);
    if (!freeSpace || freeSpace.floor !== selectedFloor) return;
    const { x: mouseX, y: mouseY } = getCanvasCoordinates(e);
    setResizingFreeSpace(id);
    setResizeHandle(handle);
    setSelectedFreeSpace(id);
    setResizeStart({
      x: mouseX,
      y: mouseY,
      width: freeSpace.width,
      height: freeSpace.height,
    });
  };

  // handleFreeSpaceResize is now handled globally via useEffect below

  const handleFreeSpaceResizeEnd = () => {
    if (resizingFreeSpace) {
      saveToHistory();
    }
    setResizingFreeSpace(null);
    setResizeHandle(null);
  };

  // Save state to history
  const saveToHistory = () => {
    const newState: HistoryState = {
      seats: JSON.parse(JSON.stringify(seats)),
      busElements: JSON.parse(JSON.stringify(busElements)),
      freeSpaces: JSON.parse(JSON.stringify(freeSpaces)),
    };
    
    setHistory(prev => {
      // Remove any states after current index (when undoing and then making new changes)
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, newState];
    });
    setHistoryIndex(prev => prev + 1);
    
    // Limit history to 50 states
    if (history.length > 50) {
      setHistory(prev => prev.slice(1));
      setHistoryIndex(prev => prev - 1);
    }
  };

  // Undo function
  const handleUndo = () => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      setSeats(previousState.seats);
      setBusElements(previousState.busElements);
      setFreeSpaces(previousState.freeSpaces);
      setHistoryIndex(prev => prev - 1);
    }
  };

  // Initialize history with initial state (only once on mount)
  useEffect(() => {
    if (history.length === 0 && historyIndex === -1) {
      const initialState: HistoryState = {
        seats: JSON.parse(JSON.stringify(seats)),
        busElements: JSON.parse(JSON.stringify(busElements)),
        freeSpaces: JSON.parse(JSON.stringify(freeSpaces)),
      };
      setHistory([initialState]);
      setHistoryIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

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

  // Zoom functions removed - no zoom needed

  // Pan removed - SVG always fits viewport, no need to pan
  const handlePanStart = () => {};
  const handlePanMove = () => {};
  const handlePanEnd = () => {};

  // Helper functions to convert between logical and physical coordinates
  const getScaleX = () => canvasSize.width / CANVAS_WIDTH;
  const getScaleY = () => canvasSize.height / CANVAS_HEIGHT;
  
  const logicalToPhysicalX = (logicalX: number) => logicalX * getScaleX();
  const logicalToPhysicalY = (logicalY: number) => logicalY * getScaleY();
  const logicalToPhysicalWidth = (logicalWidth: number) => logicalWidth * getScaleX();
  const logicalToPhysicalHeight = (logicalHeight: number) => logicalHeight * getScaleY();

  // Helper function to get canvas coordinates from mouse event
  // Canvas has fixed pixel size (canvasSize) that maps to logical size (CANVAS_WIDTH x CANVAS_HEIGHT)
  const getCanvasCoordinates = (e: React.MouseEvent): { x: number; y: number } => {
    if (!canvasRef.current || canvasSize.width === 0 || canvasSize.height === 0) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Get mouse position relative to canvas element (top-left corner)
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert rendered pixel coordinates to logical canvas coordinates (0-2400, 0-1600)
    const canvasX = mouseX / getScaleX();
    const canvasY = mouseY / getScaleY();
    
    return { x: canvasX, y: canvasY };
  };

  // Guide management functions
  const addHorizontalGuide = (y: number) => {
    const snappedY = snapToGrid(y);
    if (!horizontalGuides.includes(snappedY)) {
      setHorizontalGuides([...horizontalGuides, snappedY].sort((a, b) => a - b));
    }
  };

  const addVerticalGuide = (x: number) => {
    const snappedX = snapToGrid(x);
    if (!verticalGuides.includes(snappedX)) {
      setVerticalGuides([...verticalGuides, snappedX].sort((a, b) => a - b));
    }
  };

  const removeHorizontalGuide = (y: number) => {
    setHorizontalGuides(horizontalGuides.filter(guideY => guideY !== y));
  };

  const removeVerticalGuide = (x: number) => {
    setVerticalGuides(verticalGuides.filter(guideX => guideX !== x));
  };

  const handleGuideClick = (e: React.MouseEvent) => {
    if (addingGuide) {
      const { x, y } = getCanvasCoordinates(e);
      if (addingGuide === "horizontal") {
        addHorizontalGuide(y);
      } else if (addingGuide === "vertical") {
        addVerticalGuide(x);
      }
      setAddingGuide(false);
      e.stopPropagation();
    }
  };

  // Multi-selection functions
  const handleSelectionStart = (e: React.MouseEvent) => {
    if (selectionMode && editMode === "seats" && !dragging && !editingSeatId) {
      const { x, y } = getCanvasCoordinates(e);
      setIsSelecting(true);
      setSelectionBox({ start: { x, y }, end: { x, y } });
      // Keep selection for keyboard movement - don't clear it
      // Selection will be cleared when clicking on empty canvas
    }
  };

  const handleSelectionMove = (e: React.MouseEvent) => {
    if (isSelecting && selectionBox) {
      const { x, y } = getCanvasCoordinates(e);
      setSelectionBox({ ...selectionBox, end: { x, y } });
      
      // Update selected seats based on selection box
      const minX = Math.min(selectionBox.start.x, x);
      const maxX = Math.max(selectionBox.start.x, x);
      const minY = Math.min(selectionBox.start.y, y);
      const maxY = Math.max(selectionBox.start.y, y);
      
      const newSelected = new Set(selectedSeats);
      const currentFloorSeats = seats.filter((s) => s.floor === selectedFloor);
      currentFloorSeats.forEach(seat => {
        const seatWidth = getSeatWidth(seat.type);
        const seatHeight = SEAT_HEIGHT;
        const seatCenterX = seat.x + seatWidth / 2;
        const seatCenterY = seat.y + seatHeight / 2;
        
        if (seatCenterX >= minX && seatCenterX <= maxX && seatCenterY >= minY && seatCenterY <= maxY) {
          newSelected.add(seat.id);
        }
      });
      setSelectedSeats(newSelected);
    }
  };

  const handleSelectionEnd = () => {
    setIsSelecting(false);
    setSelectionBox(null);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Handle guide adding
    if (addingGuide) {
      handleGuideClick(e);
      return;
    }

    // Handle element creation in elements mode
    if (editMode === "elements" && selectedElementType) {
      if (!canvasRef.current || draggingElement || draggingFreeSpace || isPanning) return;
      const { x, y } = getCanvasCoordinates(e);
      
      // Check if click is on an existing element
      const clickedElement = busElements.find((el) => {
        const elX = el.x;
        const elY = el.y; // Element Y position
        return (
          x >= elX &&
          x <= elX + el.width &&
          y >= elY - el.height / 2 &&
          y <= elY + el.height / 2 &&
          el.floor === selectedFloor
        );
      });
      
      if (clickedElement) return;
      
      // Create new door element
      const newElement: BusElement = {
        id: `${selectedElementType}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        type: selectedElementType,
        x: snapValue(x, horizontalGuides, verticalGuides, snapEnabled, true, false),
        y: snapValue(y, horizontalGuides, verticalGuides, snapEnabled, true, true),
        width: 64,
        height: 80,
        floor: selectedFloor,
      };
      
      setBusElements([...busElements, newElement]);
      setSelectedElementType(null); // Reset selection after creating
      saveToHistory();
      return;
    }
    
    // Only handle clicks for seat creation in seats mode
    if (!canvasRef.current || dragging || draggingElement || draggingFreeSpace || editingSeatId || isPanning || editMode !== "seats") return;

    // If free_space type, handle it with mouse down/up
    if (selectedSeatType === "free_space") {
      handleFreeSpaceMouseDown(e);
      return;
    }

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

    // Handle multi-selection
    if (selectionMode && clickedSeat) {
      const newSelected = new Set(selectedSeats);
      if (e.ctrlKey || e.metaKey) {
        if (newSelected.has(clickedSeat.id)) {
          newSelected.delete(clickedSeat.id);
        } else {
          newSelected.add(clickedSeat.id);
        }
      } else {
        newSelected.clear();
        newSelected.add(clickedSeat.id);
      }
      setSelectedSeats(newSelected);
      return;
    }

    // If clicked on a seat and not in selection mode, select it for keyboard movement
    if (clickedSeat && !selectionMode) {
      setSelectedSeats(new Set([clickedSeat.id]));
      return;
    }

    // Clear selection when clicking on empty canvas
    if (!clickedSeat && !selectionMode) {
      setSelectedSeats(new Set());
    }

    // Create new seat with snap
    let x = clickX - SEAT_WIDTH / 2;
    let y = clickY - SEAT_HEIGHT / 2;

    // Use enhanced snap function
    x = snapValue(x, horizontalGuides, verticalGuides, snapEnabled, true, false);
    y = snapValue(y, horizontalGuides, verticalGuides, snapEnabled, true, true);

    // Use full canvas - no bus bounds constraints
    // Allow placing seats anywhere on the canvas
    const margin = 20; // Small margin from edges
    const constrainedX = Math.max(margin, Math.min(x, CANVAS_WIDTH - getSeatWidth(selectedSeatType) - margin));
    const constrainedY = Math.max(margin, Math.min(y, CANVAS_HEIGHT - SEAT_HEIGHT - margin));

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
    saveToHistory();
  };

  const handleSeatDragStart = (seatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (editingSeatId) return;

    const seat = seats.find((s) => s.id === seatId);
    if (!seat) return;

    const { x: mouseX, y: mouseY } = getCanvasCoordinates(e);

    // If in selection mode and this seat is selected, prepare for multi-drag
    if (selectionMode && selectedSeats.has(seatId) && selectedSeats.size > 1) {
      setDragging(seatId);
      setMultiDragOffset({
        x: mouseX - seat.x,
        y: mouseY - seat.y,
      });
    } else {
      // Single seat drag
      setDragging(seatId);
      setDragOffset({
        x: mouseX - seat.x,
        y: mouseY - seat.y,
      });
      // Keep selection for keyboard movement, only clear if explicitly clicking elsewhere
      // Don't clear selection here - let it be cleared by canvas click handler
    }
  };

  const handleSeatDrag = (e: MouseEvent | React.MouseEvent) => {
    if (!dragging || !canvasRef.current || editingSeatId) return;

    // Handle both React.MouseEvent and native MouseEvent
    let clientX: number, clientY: number;
    if ('nativeEvent' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (clientX - rect.left) / getScaleX();
    const mouseY = (clientY - rect.top) / getScaleY();

    const draggedSeat = seats.find(s => s.id === dragging);
    if (!draggedSeat) return;

    // Check if we're dragging multiple seats
    const isMultiDrag = selectionMode && selectedSeats.has(dragging) && multiDragOffset;
    
    if (isMultiDrag && multiDragOffset) {
      // Calculate offset for all selected seats
      const baseX = mouseX - multiDragOffset.x;
      const baseY = mouseY - multiDragOffset.y;
      const deltaX = baseX - draggedSeat.x;
      const deltaY = baseY - draggedSeat.y;

      // Move all selected seats
      setSeats((prev) =>
        prev.map((seat) => {
          if (selectedSeats.has(seat.id) && seat.floor === selectedFloor) {
            let newX = seat.x + deltaX;
            let newY = seat.y + deltaY;

            // Apply snap to all seats
            newX = snapValue(newX, horizontalGuides, verticalGuides, snapEnabled, true, false);
            newY = snapValue(newY, horizontalGuides, verticalGuides, snapEnabled, true, true);

            const margin = 20;
            return {
              ...seat,
              x: Math.max(margin, Math.min(newX, CANVAS_WIDTH - getSeatWidth(seat.type) - margin)),
              y: Math.max(margin, Math.min(newY, CANVAS_HEIGHT - SEAT_HEIGHT - margin)),
            };
          }
          return seat;
        })
      );
    } else {
      // Single seat drag
      let x = mouseX - dragOffset.x;
      let y = mouseY - dragOffset.y;

      // Use enhanced snap function
      x = snapValue(x, horizontalGuides, verticalGuides, snapEnabled, true, false);
      y = snapValue(y, horizontalGuides, verticalGuides, snapEnabled, true, true);

      // Constrain seat placement within canvas bounds
      const margin = 20;
      
      setSeats((prev) =>
        prev.map((seat) =>
          seat.id === dragging
            ? {
                ...seat,
                x: Math.max(margin, Math.min(x, CANVAS_WIDTH - getSeatWidth(seat.type) - margin)),
                y: Math.max(margin, Math.min(y, CANVAS_HEIGHT - SEAT_HEIGHT - margin)),
              }
            : seat
        )
      );
    }
  };

  const handleSeatDragEnd = () => {
    setDragging(null);
    setMultiDragOffset(null);
    setDragOffset({ x: 0, y: 0 });
  };

  // Global mouse event handlers for dragging
  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current || !canvasSize.width || !canvasSize.height) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const getScaleX = () => canvasSize.width / CANVAS_WIDTH;
      const getScaleY = () => canvasSize.height / CANVAS_HEIGHT;
      const mouseX = (e.clientX - rect.left) / getScaleX();
      const mouseY = (e.clientY - rect.top) / getScaleY();

      const draggedSeat = seats.find(s => s.id === dragging);
      if (!draggedSeat) return;

      // Check if we're dragging multiple seats
      const isMultiDrag = selectionMode && selectedSeats.has(dragging) && multiDragOffset;
      
      if (isMultiDrag && multiDragOffset) {
        // Calculate offset for all selected seats
        const baseX = mouseX - multiDragOffset.x;
        const baseY = mouseY - multiDragOffset.y;
        const deltaX = baseX - draggedSeat.x;
        const deltaY = baseY - draggedSeat.y;

        // Move all selected seats
        setSeats((prev) =>
          prev.map((seat) => {
            if (selectedSeats.has(seat.id) && seat.floor === selectedFloor) {
              let newX = seat.x + deltaX;
              let newY = seat.y + deltaY;

              // Apply snap to all seats
              newX = snapValue(newX, horizontalGuides, verticalGuides, snapEnabled, true, false);
              newY = snapValue(newY, horizontalGuides, verticalGuides, snapEnabled, true, true);

              const margin = 20;
              return {
                ...seat,
                x: Math.max(margin, Math.min(newX, CANVAS_WIDTH - getSeatWidth(seat.type) - margin)),
                y: Math.max(margin, Math.min(newY, CANVAS_HEIGHT - SEAT_HEIGHT - margin)),
              };
            }
            return seat;
          })
        );
      } else {
        // Single seat drag
        let x = mouseX - dragOffset.x;
        let y = mouseY - dragOffset.y;

        // Use enhanced snap function
        x = snapValue(x, horizontalGuides, verticalGuides, snapEnabled, true, false);
        y = snapValue(y, horizontalGuides, verticalGuides, snapEnabled, true, true);

        // Constrain seat placement within canvas bounds
        const margin = 20;
        
        setSeats((prev) =>
          prev.map((seat) =>
            seat.id === dragging
              ? {
                  ...seat,
                  x: Math.max(margin, Math.min(x, CANVAS_WIDTH - getSeatWidth(seat.type) - margin)),
                  y: Math.max(margin, Math.min(y, CANVAS_HEIGHT - SEAT_HEIGHT - margin)),
                }
              : seat
          )
        );
      }
    };

    const handleMouseUp = () => {
      if (dragging) {
        saveToHistory();
      }
      handleSeatDragEnd();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, dragOffset, multiDragOffset, selectedSeats, selectionMode, horizontalGuides, verticalGuides, snapEnabled, seats, selectedFloor, canvasSize]);

  // Global mouse event handlers for element dragging
  useEffect(() => {
    if (!draggingElement || !canvasRef.current || !canvasSize.width || !canvasSize.height) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current || !canvasSize.width || !canvasSize.height) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const getScaleX = () => canvasSize.width / CANVAS_WIDTH;
      const getScaleY = () => canvasSize.height / CANVAS_HEIGHT;
      const mouseX = (e.clientX - rect.left) / getScaleX();
      const mouseY = (e.clientY - rect.top) / getScaleY();

      const element = busElements.find(el => el.id === draggingElement);
      if (!element) return;

      let x = mouseX - dragOffset.x;
      let y = mouseY - dragOffset.y;

      // Use enhanced snap function with guides
      if (snapEnabled) {
        x = snapValue(x, horizontalGuides, verticalGuides, snapEnabled, true, false);
        y = snapValue(y, horizontalGuides, verticalGuides, snapEnabled, true, true);
      }

      // Get element base dimensions (without multipliers for calculations)
      const baseWidth = element.width;
      const baseHeight = element.height;

      // Constrain element placement within canvas bounds
      const margin = 20;
      let constrainedY = y;
      if (element.type === "frontDoor" || element.type === "rearDoor") {
        // Doors are centered vertically
        const minY = baseHeight / 2 + margin;
        const maxY = CANVAS_HEIGHT - baseHeight / 2 - margin;
        constrainedY = Math.max(minY, Math.min(y, maxY));
      } else {
        // Regular elements
        constrainedY = Math.max(margin, Math.min(y, CANVAS_HEIGHT - baseHeight - margin));
      }

      // Constrain X position
      const constrainedX = Math.max(margin, Math.min(x, CANVAS_WIDTH - baseWidth - margin));

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

    const handleMouseUp = () => {
      if (draggingElement) {
        saveToHistory();
      }
      setDraggingElement(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingElement, dragOffset, horizontalGuides, verticalGuides, snapEnabled, busElements, selectedFloor, canvasSize]);

  // Global mouse event handlers for element resizing
  useEffect(() => {
    if (!resizingElement || !canvasRef.current || !canvasSize.width || !canvasSize.height) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current || !canvasSize.width || !canvasSize.height) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const getScaleX = () => canvasSize.width / CANVAS_WIDTH;
      const getScaleY = () => canvasSize.height / CANVAS_HEIGHT;
      const currentX = (e.clientX - rect.left) / getScaleX();
      const currentY = (e.clientY - rect.top) / getScaleY();

      const element = busElements.find(el => el.id === resizingElement);
      if (!element) return;

      // Calculate delta from resize start position
      const deltaX = currentX - resizeStart.x;
      const deltaY = currentY - resizeStart.y;

      // Calculate new dimensions (maintain top-left corner position)
      let newWidth = Math.max(20, resizeStart.width + deltaX);
      let newHeight = Math.max(20, resizeStart.height + deltaY);

      // Use enhanced snap function with guides
      if (snapEnabled) {
        newWidth = snapValue(newWidth, horizontalGuides, verticalGuides, snapEnabled, true, false);
        newHeight = snapValue(newHeight, horizontalGuides, verticalGuides, snapEnabled, true, true);
      }

      // Constrain resize within canvas bounds
      const margin = 20;
      if (element.type === "frontDoor" || element.type === "rearDoor") {
        // Doors are centered vertically
        const doorTop = element.y - newHeight / 2;
        const doorBottom = element.y + newHeight / 2;
        if (doorTop < margin) {
          newHeight = (element.y - margin) * 2;
        }
        if (doorBottom > CANVAS_HEIGHT - margin) {
          newHeight = (CANVAS_HEIGHT - margin - element.y) * 2;
        }
      } else {
        // Regular elements
        if (element.x + newWidth > CANVAS_WIDTH - margin) {
          newWidth = CANVAS_WIDTH - margin - element.x;
        }
        if (element.y + newHeight > CANVAS_HEIGHT - margin) {
          newHeight = CANVAS_HEIGHT - margin - element.y;
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

    const handleMouseUp = () => {
      setResizingElement(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingElement, resizeStart, horizontalGuides, verticalGuides, snapEnabled, busElements, selectedFloor, canvasSize]);

  // Element drag handlers
  const handleElementDragStart = (elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (editMode !== "elements" || editingSeatId || resizingElement) return;

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

  // handleElementDrag is now handled globally via useEffect above

  const handleElementDragEnd = () => {
    setDraggingElement(null);
  };

  // Element resize handlers with multi-directional resize
  const handleElementResizeStart = (elementId: string, handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (editMode !== "elements" || draggingElement) return;

    const element = busElements.find((el) => el.id === elementId);
    if (!element || element.floor !== selectedFloor) return;

    const { x: mouseX, y: mouseY } = getCanvasCoordinates(e);
    setResizingElement(elementId);
    setResizeHandle(handle);
    setSelectedElement(elementId);
    setResizeStart({
      x: mouseX,
      y: mouseY,
      width: element.width,
      height: element.height,
    });
  };

  // handleElementResize is now handled globally via useEffect above

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
      double: 268, // 134 * 2 = 268
      aisle: 134, // 67 * 2 = 134
      stair: 280, // 140 * 2 = 280
      bathroom: 224, // 112 * 2 = 224
      single: SEAT_WIDTH,
      disabled: SEAT_WIDTH,
      extra_space: SEAT_WIDTH,
      free_space: 560, // 280 * 2 = 560
    };
    const baseWidth = baseWidths[type] || SEAT_WIDTH;
    const multiplier = type === "stair" ? sizeMultipliers.stairs : sizeMultipliers.seats;
    return baseWidth * multiplier;
  };

  const getSeatSize = (type: SeatType): { width: number; height: number } => {
    const baseSizes: Record<SeatType, { w: number; h: number }> = {
      double: { w: 268, h: 134 }, // 134*2, 67*2
      aisle: { w: 134, h: 134 }, // 67*2, 67*2
      stair: { w: 280, h: 180 }, // 140*2, 90*2
      bathroom: { w: 224, h: 180 }, // 112*2, 90*2
      single: { w: SEAT_WIDTH, h: SEAT_HEIGHT },
      disabled: { w: SEAT_WIDTH, h: SEAT_HEIGHT },
      extra_space: { w: SEAT_WIDTH, h: SEAT_HEIGHT },
      free_space: { w: 560, h: 336 }, // 280*2, 168*2
    };
    
    const base = baseSizes[type] || baseSizes.single;
    const multiplier = type === "stair" ? sizeMultipliers.stairs : sizeMultipliers.seats;
    
    return {
      width: base.w * multiplier,
      height: base.h * multiplier,
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
    if (type === "free_space") return "bg-transparent border-2 border-dashed border-gray-400"; // Transparent with dashed border
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
    free_space: "Espacio Libre",
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
        backgroundSize: `${SNAP_GRID_SIZE}px ${SNAP_GRID_SIZE}px`,
        backgroundPosition: `0px 0px`,
      }
    : {};

  // No need to update door positions - elements are free to move

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
          
          {/* Canvas Size */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Tamaño del Canvas: {canvasScale}%
            </label>
            <input
              type="range"
              min="50"
              max="200"
              step="5"
              value={canvasScale}
              onChange={(e) => setCanvasScale(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>50%</span>
              <span>100%</span>
              <span>200%</span>
            </div>
          </div>

          {/* Size Multipliers - Simple Menu */}
          <div className="border-t border-border pt-4">
            <h5 className="font-semibold mb-3">Tamaño de Iconos</h5>
            <div className="grid grid-cols-3 gap-4">
              {/* Doors Size */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Puertas: {Math.round(sizeMultipliers.doors * 100)}%
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
                  }}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> Usa el botón &quot;Modo Elementos&quot; en el toolbar para editar puertas y espacios libres directamente en el canvas. 
              Arrastra para mover y usa la esquina inferior derecha para redimensionar.
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg flex-wrap">
        {/* Undo Button */}
        <button
          onClick={handleUndo}
          disabled={historyIndex <= 0}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            historyIndex <= 0
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-muted hover:bg-muted/80"
          }`}
          title="Deshacer (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
          Deshacer
        </button>
        
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
        {editMode === "seats" && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Tipo:</span>
            {(["single", "double", "aisle", "disabled", "extra_space", "stair", "bathroom", "free_space"] as SeatType[]).map((type) => (
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
        )}
        {editMode === "elements" && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Elementos:</span>
            <button
              onClick={() => {
                setSelectedElementType(selectedElementType === "frontDoor" ? null : "frontDoor");
                setSelectedElement(null);
              }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                selectedElementType === "frontDoor"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              Entrada
            </button>
            <button
              onClick={() => {
                setSelectedElementType(selectedElementType === "rearDoor" ? null : "rearDoor");
                setSelectedElement(null);
              }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                selectedElementType === "rearDoor"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              Salida
            </button>
          </div>
        )}
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAddingGuide(addingGuide === "horizontal" ? false : "horizontal");
                setSelectionMode(false);
              }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                addingGuide === "horizontal"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
              title="Agregar Regla Horizontal (click en el canvas)"
            >
              <Ruler className="w-4 h-4 rotate-90" />
              H
            </button>
            <button
              onClick={() => {
                setAddingGuide(addingGuide === "vertical" ? false : "vertical");
                setSelectionMode(false);
              }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                addingGuide === "vertical"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
              title="Agregar Regla Vertical (click en el canvas)"
            >
              <Ruler className="w-4 h-4" />
              V
            </button>
          </div>
          <button
            onClick={() => {
              setSelectionMode(!selectionMode);
              setAddingGuide(false);
              if (!selectionMode) {
                setSelectedSeats(new Set());
              }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              selectionMode
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
            title="Modo Selección Múltiple (arrastra para seleccionar)"
          >
            <MousePointer2 className="w-4 h-4" />
            Selección {selectionMode ? "ON" : "OFF"}
          </button>
          {selectedSeats.size > 0 && (
            <span className="px-3 py-2 rounded-lg text-sm font-medium bg-primary/20 text-primary">
              {selectedSeats.size} seleccionado{selectedSeats.size > 1 ? "s" : ""}
            </span>
          )}
          {(horizontalGuides.length > 0 || verticalGuides.length > 0) && (
            <button
              onClick={() => {
                setHorizontalGuides([]);
                setVerticalGuides([]);
              }}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-destructive/20 text-destructive hover:bg-destructive/30"
              title="Eliminar todas las reglas"
            >
              Limpiar Reglas ({horizontalGuides.length + verticalGuides.length})
            </button>
          )}
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setSeats([])}
          className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90"
        >
          Limpiar Todo
        </button>
      </div>

      {/* Canvas Container - Full width, no borders, site background */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden"
        style={{ 
          height: '100vh',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
      >
        {/* Canvas Wrapper - Contains both SVG and interactive canvas */}
        {canvasSize.width > 0 && canvasSize.height > 0 && (
          <div
            style={{
              position: 'relative',
              width: `${canvasSize.width}px`,
              height: `${canvasSize.height}px`,
            }}
          >
            {/* SVG Background */}
            {svgTemplate && (
              <div
                className="absolute inset-0 pointer-events-none z-0"
                style={{
                  width: '100%',
                  height: '100%',
                }}
                dangerouslySetInnerHTML={{ 
                  __html: svgTemplate
                }}
              />
            )}
            
            {/* Interactive Canvas - positioned exactly over SVG */}
            <div
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseMove={(e) => {
                if (editMode === "seats") {
                  // handleSeatDrag is now handled globally via useEffect
                  if (creatingFreeSpace) {
                    handleFreeSpaceMouseMove(e);
                  }
                  if (isSelecting) {
                    handleSelectionMove(e);
                  }
                }
                if (editMode === "elements") {
                  // Element drag and resize are now handled globally via useEffect
                  if (draggingFreeSpace) {
                    handleFreeSpaceDrag(e);
                  }
                }
              }}
              onMouseUp={(e) => {
                if (editMode === "seats") {
                  handleSeatDragEnd();
                  if (creatingFreeSpace) {
                    handleFreeSpaceMouseUp(e);
                  }
                  if (isSelecting) {
                    handleSelectionEnd();
                  }
                }
                if (editMode === "elements") {
                  handleElementDragEnd();
                  handleElementResizeEnd();
                  handleFreeSpaceDragEnd();
                  handleFreeSpaceResizeEnd();
                }
              }}
              onMouseLeave={(e) => {
                if (editMode === "seats") {
                  handleSeatDragEnd();
                  if (creatingFreeSpace) {
                    setCreatingFreeSpace(false);
                    setFreeSpaceStart(null);
                    setFreeSpaceCurrent(null);
                  }
                }
                if (editMode === "elements") {
                  handleElementDragEnd();
                  handleElementResizeEnd();
                  handleFreeSpaceDragEnd();
                  handleFreeSpaceResizeEnd();
                }
              }}
              className={`absolute inset-0 ${addingGuide ? "cursor-crosshair" : selectionMode ? "cursor-default" : "cursor-crosshair"}`}
              style={{
                width: '100%',
                height: '100%',
                ...gridBackgroundStyle,
              }}
              onMouseDown={(e) => {
                if (selectionMode && editMode === "seats") {
                  handleSelectionStart(e);
                }
              }}
              onMouseMove={(e) => {
                if (isSelecting) {
                  handleSelectionMove(e);
                }
              }}
              onMouseUp={() => {
                if (isSelecting) {
                  handleSelectionEnd();
                }
              }}
            >
          {/* Horizontal Guides (Rulers) */}
          {horizontalGuides.map((guideY) => (
            <div
              key={`h-${guideY}`}
              className="absolute left-0 right-0 z-5 pointer-events-none"
              style={{
                top: `${logicalToPhysicalY(guideY)}px`,
                height: '2px',
                backgroundColor: '#3b82f6',
                boxShadow: '0 0 4px rgba(59, 130, 246, 0.5)',
              }}
            >
              <div
                className="absolute -left-8 top-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs px-1 rounded"
                style={{ fontSize: '10px' }}
              >
                {Math.round(guideY)}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeHorizontalGuide(guideY);
                }}
                className="absolute -right-8 top-1/2 -translate-y-1/2 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-auto"
                title="Eliminar regla"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Vertical Guides (Rulers) */}
          {verticalGuides.map((guideX) => (
            <div
              key={`v-${guideX}`}
              className="absolute top-0 bottom-0 z-5 pointer-events-none"
              style={{
                left: `${logicalToPhysicalX(guideX)}px`,
                width: '2px',
                backgroundColor: '#3b82f6',
                boxShadow: '0 0 4px rgba(59, 130, 246, 0.5)',
              }}
            >
              <div
                className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-1 rounded"
                style={{ fontSize: '10px' }}
              >
                {Math.round(guideX)}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeVerticalGuide(guideX);
                }}
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-auto"
                title="Eliminar regla"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Selection Box */}
          {selectionBox && (
            <div
              className="absolute border-2 border-primary bg-primary/10 z-40 pointer-events-none"
              style={{
                left: `${logicalToPhysicalX(Math.min(selectionBox.start.x, selectionBox.end.x))}px`,
                top: `${logicalToPhysicalY(Math.min(selectionBox.start.y, selectionBox.end.y))}px`,
                width: `${logicalToPhysicalWidth(Math.abs(selectionBox.end.x - selectionBox.start.x))}px`,
                height: `${logicalToPhysicalHeight(Math.abs(selectionBox.end.y - selectionBox.start.y))}px`,
              }}
            />
          )}

          {/* Bus Elements - Doors (Editable) */}
          {busElements
            .filter(el => el.floor === selectedFloor)
            .map((element) => {
              const isSelected = selectedElement === element.id;
              const isDragging = draggingElement === element.id;
              const isResizing = resizingElement === element.id;
              
              let bgColor = "bg-gray-50";
              let borderColor = "border-dashed border-gray-400";
              let label = "";
              
              if (element.type === "frontDoor") {
                label = "ENTRADA";
              } else if (element.type === "rearDoor") {
                label = "SALIDA";
              }
              
              return (
                <div
                  key={element.id}
                  className={`absolute ${bgColor} ${borderColor} rounded flex items-center justify-center group transition-colors ${
                    editMode === "elements" ? "cursor-move" : ""
                  } ${isSelected ? "ring-2 ring-primary bg-primary/20" : ""} ${
                    isDragging || isResizing ? "z-50" : "z-20"
                  }`}
                  style={{
                    left: `${logicalToPhysicalX(element.x)}px`,
                    top: `${logicalToPhysicalY(element.y)}px`,
                    width: `${logicalToPhysicalWidth(element.width * sizeMultipliers.doors)}px`,
                    height: `${logicalToPhysicalHeight(element.height * sizeMultipliers.doors)}px`,
                    transform: "translateY(-50%)",
                  }}
                  onMouseDown={(e) => {
                    if (editMode === "elements") {
                      e.stopPropagation();
                      // Don't start drag if clicking on resize handle
                      if (!e.target || !(e.target as HTMLElement).closest('.resize-handle')) {
                        handleElementDragStart(element.id, e);
                        setSelectedElement(element.id);
                      }
                    }
                  }}
                  onClick={(e) => {
                    if (editMode === "elements") {
                      e.stopPropagation();
                      // Only select if not already dragging
                      if (!draggingElement && !resizingElement) {
                        setSelectedElement(element.id);
                      }
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    deleteElement(element.id, 'busElement');
                  }}
                >
                  <div className="text-[10px] font-semibold text-gray-600 text-center whitespace-nowrap">
                    {label}
                  </div>
                  
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteElement(element.id, 'busElement');
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 z-30"
                    title="Eliminar elemento"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  
                  {/* Resize handles - all sides and corners */}
                  {editMode === "elements" && isSelected && (
                    <>
                      {/* Corner handles */}
                      <div className="resize-handle absolute -top-1 -left-1 w-4 h-4 bg-primary cursor-nwse-resize z-50 rounded-sm" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); handleElementResizeStart(element.id, 'nw', e); }} title="Arrastra para redimensionar" />
                      <div className="resize-handle absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary cursor-ns-resize z-50 rounded-sm" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); handleElementResizeStart(element.id, 'n', e); }} title="Arrastra para redimensionar" />
                      <div className="resize-handle absolute -top-1 -right-1 w-4 h-4 bg-primary cursor-nesw-resize z-50 rounded-sm" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); handleElementResizeStart(element.id, 'ne', e); }} title="Arrastra para redimensionar" />
                      <div className="resize-handle absolute top-1/2 -right-1 -translate-y-1/2 w-4 h-4 bg-primary cursor-ew-resize z-50 rounded-sm" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); handleElementResizeStart(element.id, 'e', e); }} title="Arrastra para redimensionar" />
                      <div className="resize-handle absolute -bottom-1 -right-1 w-4 h-4 bg-primary cursor-nwse-resize z-50 rounded-sm" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); handleElementResizeStart(element.id, 'se', e); }} title="Arrastra para redimensionar" />
                      <div className="resize-handle absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary cursor-ns-resize z-50 rounded-sm" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); handleElementResizeStart(element.id, 's', e); }} title="Arrastra para redimensionar" />
                      <div className="resize-handle absolute -bottom-1 -left-1 w-4 h-4 bg-primary cursor-nesw-resize z-50 rounded-sm" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); handleElementResizeStart(element.id, 'sw', e); }} title="Arrastra para redimensionar" />
                      <div className="resize-handle absolute top-1/2 -left-1 -translate-y-1/2 w-4 h-4 bg-primary cursor-ew-resize z-50 rounded-sm" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); handleElementResizeStart(element.id, 'w', e); }} title="Arrastra para redimensionar" />
                    </>
                  )}
                  
                  {/* Selection indicator */}
                  {editMode === "elements" && isSelected && (
                    <div className="absolute -inset-1 border-2 border-primary border-dashed pointer-events-none" />
                  )}
                </div>
              );
            })}

          {/* Free Space Elements */}
          {freeSpaces
            .filter(fs => fs.floor === selectedFloor)
            .map((freeSpace) => {
              const isSelected = selectedFreeSpace === freeSpace.id;
              const isDragging = draggingFreeSpace === freeSpace.id;
              const isResizing = resizingFreeSpace === freeSpace.id;
              
              return (
                <div
                  key={freeSpace.id}
                  className={`absolute bg-transparent border-2 border-dashed border-gray-400 rounded flex items-center justify-center group ${
                    editMode === "elements" ? "cursor-move" : ""
                  } ${isSelected ? "ring-2 ring-primary border-primary" : ""} ${
                    isDragging || isResizing ? "z-50" : "z-15"
                  }`}
                  style={{
                    left: `${logicalToPhysicalX(freeSpace.x)}px`,
                    top: `${logicalToPhysicalY(freeSpace.y)}px`,
                    width: `${logicalToPhysicalWidth(freeSpace.width)}px`,
                    height: `${logicalToPhysicalHeight(freeSpace.height)}px`,
                  }}
                  onMouseDown={(e) => {
                    if (editMode === "elements") {
                      handleFreeSpaceDragStart(freeSpace.id, e);
                    }
                  }}
                  onClick={(e) => {
                    if (editMode === "elements") {
                      e.stopPropagation();
                      setSelectedFreeSpace(freeSpace.id);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    deleteElement(freeSpace.id, 'freeSpace');
                  }}
                >
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteElement(freeSpace.id, 'freeSpace');
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 z-30"
                    title="Eliminar espacio libre"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  
                  {/* Resize handles - all sides and corners */}
                  {editMode === "elements" && isSelected && (
                    <>
                      {/* Corner handles */}
                      <div className="resize-handle absolute -top-1 -left-1 w-4 h-4 bg-primary cursor-nwse-resize z-50 rounded-sm" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); handleFreeSpaceResizeStart(freeSpace.id, 'nw', e); }} title="Arrastra para redimensionar" />
                      <div className="resize-handle absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary cursor-ns-resize z-50 rounded-sm" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); handleFreeSpaceResizeStart(freeSpace.id, 'n', e); }} title="Arrastra para redimensionar" />
                      <div className="resize-handle absolute -top-1 -right-1 w-4 h-4 bg-primary cursor-nesw-resize z-50 rounded-sm" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); handleFreeSpaceResizeStart(freeSpace.id, 'ne', e); }} title="Arrastra para redimensionar" />
                      <div className="resize-handle absolute top-1/2 -right-1 -translate-y-1/2 w-4 h-4 bg-primary cursor-ew-resize z-50 rounded-sm" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); handleFreeSpaceResizeStart(freeSpace.id, 'e', e); }} title="Arrastra para redimensionar" />
                      <div className="resize-handle absolute -bottom-1 -right-1 w-4 h-4 bg-primary cursor-nwse-resize z-50 rounded-sm" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); handleFreeSpaceResizeStart(freeSpace.id, 'se', e); }} title="Arrastra para redimensionar" />
                      <div className="resize-handle absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary cursor-ns-resize z-50 rounded-sm" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); handleFreeSpaceResizeStart(freeSpace.id, 's', e); }} title="Arrastra para redimensionar" />
                      <div className="resize-handle absolute -bottom-1 -left-1 w-4 h-4 bg-primary cursor-nesw-resize z-50 rounded-sm" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); handleFreeSpaceResizeStart(freeSpace.id, 'sw', e); }} title="Arrastra para redimensionar" />
                      <div className="resize-handle absolute top-1/2 -left-1 -translate-y-1/2 w-4 h-4 bg-primary cursor-ew-resize z-50 rounded-sm" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); handleFreeSpaceResizeStart(freeSpace.id, 'w', e); }} title="Arrastra para redimensionar" />
                    </>
                  )}
                  
                  {/* Selection indicator */}
                  {editMode === "elements" && isSelected && (
                    <div className="absolute -inset-1 border-2 border-primary border-dashed pointer-events-none" />
                  )}
                </div>
              );
            })}

          {/* Preview free space while creating */}
          {creatingFreeSpace && freeSpaceStart && freeSpaceCurrent && (
            <div
              className="absolute bg-transparent border-2 border-dashed border-primary rounded z-40"
              style={{
                left: `${logicalToPhysicalX(Math.min(freeSpaceStart.x, freeSpaceCurrent.x))}px`,
                top: `${logicalToPhysicalY(Math.min(freeSpaceStart.y, freeSpaceCurrent.y))}px`,
                width: `${logicalToPhysicalWidth(Math.abs(freeSpaceCurrent.x - freeSpaceStart.x))}px`,
                height: `${logicalToPhysicalHeight(Math.abs(freeSpaceCurrent.y - freeSpaceStart.y))}px`,
              }}
            />
          )}

          {/* Instructions */}
          {seatsForCurrentFloor.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center text-muted-foreground bg-background/80 p-4 rounded-lg">
                <p className="text-lg mb-2 font-semibold">Haz clic para agregar asientos en el Piso {selectedFloor}</p>
                <p className="text-sm">Arrastra para mover • Doble clic para editar número • Botón X para eliminar</p>
                <p className="text-sm mt-1">El SVG se ajusta automáticamente al tamaño de la pantalla</p>
                {snapEnabled && (
                  <p className="text-xs mt-2 text-primary">Snap activado: Los asientos se alinearán automáticamente</p>
                )}
              </div>
            </div>
          )}

          {/* Seats for current floor */}
          {seatsForCurrentFloor.map((seat) => {
            const isSelected = selectedSeats.has(seat.id);
            return (
              <div
                key={seat.id}
                draggable={false}
                onMouseDown={(e) => {
                  handleSeatDragStart(seat.id, e);
                  // Select seat on click (if not in selection mode, select single seat)
                  if (!selectionMode) {
                    if (e.ctrlKey || e.metaKey) {
                      // Toggle selection with Ctrl/Cmd
                      const newSelected = new Set(selectedSeats);
                      if (newSelected.has(seat.id)) {
                        newSelected.delete(seat.id);
                      } else {
                        newSelected.add(seat.id);
                      }
                      setSelectedSeats(newSelected);
                    } else {
                      // Single selection
                      setSelectedSeats(new Set([seat.id]));
                    }
                  }
                }}
                onDoubleClick={(e) => handleSeatDoubleClick(seat.id, e)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (isSelected && selectedSeats.size > 1) {
                    // Delete all selected seats
                    setSeats(prev => prev.filter(s => !selectedSeats.has(s.id)));
                    setSelectedSeats(new Set());
                  } else {
                    deleteSeat(seat.id);
                  }
                }}
                className={`absolute ${getSeatColor(seat.type, seat.floor)} rounded transition-colors cursor-move flex items-center justify-center text-white text-xs font-semibold group ${
                  dragging === seat.id ? "z-50" : "z-10"
                } ${isSelected ? "ring-4 ring-primary ring-offset-2 bg-primary/80" : ""} ${seat.type === "stair" ? "border-2 border-orange-700" : ""} ${seat.type === "bathroom" ? "border-2 border-cyan-600" : ""}`}
                style={{
                  left: `${logicalToPhysicalX(seat.x)}px`,
                  top: `${logicalToPhysicalY(seat.y)}px`,
                  width: `${logicalToPhysicalWidth(getSeatSize(seat.type).width)}px`,
                  height: `${logicalToPhysicalHeight(getSeatSize(seat.type).height)}px`,
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
            );
          })}

          {/* Seats for other floor (dimmed) */}
          {seatsForOtherFloor.map((seat) => (
            <div
              key={seat.id}
              className={`absolute ${getSeatColor(seat.type, seat.floor)} rounded opacity-30 pointer-events-none ${seat.type === "stair" ? "border-2 border-orange-700" : ""} ${seat.type === "bathroom" ? "border-2 border-cyan-600" : ""}`}
              style={{
                left: `${logicalToPhysicalX(seat.x)}px`,
                top: `${logicalToPhysicalY(seat.y)}px`,
                width: `${logicalToPhysicalWidth(getSeatSize(seat.type).width)}px`,
                height: `${logicalToPhysicalHeight(getSeatSize(seat.type).height)}px`,
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
