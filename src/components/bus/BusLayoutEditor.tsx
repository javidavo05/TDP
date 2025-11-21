"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { 
  Square, 
  Pen, 
  Copy, 
  Clipboard, 
  Save, 
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Navigation,
  Layers,
  ZoomIn,
  ZoomOut,
  Move
} from "lucide-react";

type DrawingTool = "square" | "freeform" | "select" | "move";
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

interface BusLayoutEditorProps {
  onLayoutSave: (layout: LayoutShape[]) => void;
  initialLayout?: LayoutShape[];
  className?: string;
}

const CANVAS_WIDTH = 2400;
const CANVAS_HEIGHT = 1400;
const GRID_SIZE = 20;

export function BusLayoutEditor({ 
  onLayoutSave, 
  initialLayout = [], 
  className = ""
}: BusLayoutEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shapes, setShapes] = useState<LayoutShape[]>(initialLayout);
  const [selectedTool, setSelectedTool] = useState<DrawingTool>("select");
  const [selectedIcon, setSelectedIcon] = useState<LayoutIcon | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [selectedShape, setSelectedShape] = useState<string | null>(null);
  const [copiedShape, setCopiedShape] = useState<LayoutShape | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isMoving, setIsMoving] = useState(false);
  const [moveStart, setMoveStart] = useState<{ x: number; y: number } | null>(null);
  const [originalShapePosition, setOriginalShapePosition] = useState<{ x: number; y: number; path?: { x: number; y: number }[] } | null>(null);
  const [saved, setSaved] = useState(false);

  // Blue color scheme
  const colors = {
    primary: "#0066CC",
    primaryLight: "#4A9EFF",
    primaryDark: "#003366",
    background: "#E6F2FF",
    stroke: "#0066CC",
  };

  useEffect(() => {
    drawCanvas();
  }, [shapes, zoom, pan, isDrawing, currentPath, selectedTool, startPoint, selectedShape, isMoving]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply zoom and pan
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw grid
    ctx.strokeStyle = "rgba(0, 102, 204, 0.1)";
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Draw shapes
    shapes.forEach((shape) => {
      ctx.fillStyle = shape.fill;
      ctx.strokeStyle = shape.stroke;
      ctx.lineWidth = shape.strokeWidth;

      if (shape.type === "rectangle" && shape.width && shape.height) {
        ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
      } else if (shape.type === "path" && shape.path && shape.path.length > 1) {
        ctx.beginPath();
        ctx.moveTo(shape.path[0].x, shape.path[0].y);
        for (let i = 1; i < shape.path.length; i++) {
          ctx.lineTo(shape.path[i].x, shape.path[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (shape.type === "icon" && shape.iconType) {
        drawIcon(ctx, shape);
      }

      // Highlight selected shape
      if (shape.id === selectedShape) {
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 3;
        if (shape.type === "rectangle" && shape.width && shape.height) {
          ctx.strokeRect(shape.x - 2, shape.y - 2, shape.width + 4, shape.height + 4);
        } else if (shape.type === "path" && shape.path) {
          const minX = Math.min(...shape.path.map(p => p.x));
          const maxX = Math.max(...shape.path.map(p => p.x));
          const minY = Math.min(...shape.path.map(p => p.y));
          const maxY = Math.max(...shape.path.map(p => p.y));
          ctx.strokeRect(minX - 2, minY - 2, maxX - minX + 4, maxY - minY + 4);
        } else if (shape.type === "icon") {
          ctx.beginPath();
          ctx.arc(shape.x, shape.y, 25, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    });

    // Draw current path being drawn
    if (isDrawing && currentPath.length > 0 && selectedTool === "freeform") {
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
      }
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawIcon = (ctx: CanvasRenderingContext2D, shape: LayoutShape) => {
    const iconSize = 40;
    ctx.fillStyle = colors.primary;
    ctx.strokeStyle = colors.primaryDark;
    ctx.lineWidth = 2;
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    switch (shape.iconType) {
      case "front":
        ctx.fillText("FRENTE", shape.x, shape.y);
        break;
      case "rear":
        ctx.fillText("TRASERO", shape.x, shape.y);
        break;
      case "steering":
        ctx.beginPath();
        ctx.arc(shape.x, shape.y, iconSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "white";
        ctx.fillText("⮐", shape.x, shape.y);
        break;
      case "floor1":
        ctx.fillText("1ER PISO", shape.x, shape.y);
        break;
      case "floor2":
        ctx.fillText("2DO PISO", shape.x, shape.y);
        break;
      case "stairs":
        // Draw stairs icon
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(shape.x + i * 10, shape.y - i * 10, 10, 10);
        }
        break;
    }
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  const snapToGrid = (value: number) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);

    if (e.button === 1 || (e.ctrlKey && e.button === 0)) {
      // Middle mouse or Ctrl+Left for panning
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (selectedTool === "select") {
      // Select shape
      const clickedShape = shapes.find((shape) => {
        if (shape.type === "rectangle" && shape.width && shape.height) {
          return (
            coords.x >= shape.x &&
            coords.x <= shape.x + shape.width &&
            coords.y >= shape.y &&
            coords.y <= shape.y + shape.height
          );
        } else if (shape.type === "path" && shape.path) {
          // Check if point is inside path (simple bounding box check)
          const minX = Math.min(...shape.path.map(p => p.x));
          const maxX = Math.max(...shape.path.map(p => p.x));
          const minY = Math.min(...shape.path.map(p => p.y));
          const maxY = Math.max(...shape.path.map(p => p.y));
          return (
            coords.x >= minX &&
            coords.x <= maxX &&
            coords.y >= minY &&
            coords.y <= maxY
          );
        } else if (shape.type === "icon") {
          // Check if point is near icon (within 30px)
          const distance = Math.sqrt(
            Math.pow(coords.x - shape.x, 2) + Math.pow(coords.y - shape.y, 2)
          );
          return distance < 30;
        }
        return false;
      });
      setSelectedShape(clickedShape?.id || null);
      return;
    }

    if (selectedTool === "move" && selectedShape) {
      // Start moving selected shape
      const shape = shapes.find(s => s.id === selectedShape);
      if (shape) {
        setIsMoving(true);
        // Store original position
        setOriginalShapePosition({
          x: shape.x,
          y: shape.y,
          path: shape.path ? [...shape.path] : undefined,
        });
        // Calculate offset from click point to shape origin
        let shapeX = shape.x;
        let shapeY = shape.y;
        if (shape.type === "path" && shape.path && shape.path.length > 0) {
          shapeX = shape.path[0].x;
          shapeY = shape.path[0].y;
        }
        setMoveStart({ x: coords.x - shapeX, y: coords.y - shapeY });
      }
      return;
    }

    if (selectedIcon) {
      // Place icon
      const newShape: LayoutShape = {
        id: `icon-${Date.now()}`,
        type: "icon",
        x: snapToGrid(coords.x),
        y: snapToGrid(coords.y),
        iconType: selectedIcon,
        fill: colors.primary,
        stroke: colors.primaryDark,
        strokeWidth: 2,
      };
      setShapes([...shapes, newShape]);
      return;
    }

    if (selectedTool === "square") {
      setIsDrawing(true);
      setStartPoint({ x: snapToGrid(coords.x), y: snapToGrid(coords.y) });
    } else if (selectedTool === "freeform") {
      setIsDrawing(true);
      setCurrentPath([{ x: snapToGrid(coords.x), y: snapToGrid(coords.y) }]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (isMoving && selectedShape && moveStart && originalShapePosition) {
      // Move selected shape
      const coords = getCanvasCoordinates(e);
      const newX = snapToGrid(coords.x - moveStart.x);
      const newY = snapToGrid(coords.y - moveStart.y);
      
      setShapes(shapes.map(shape => {
        if (shape.id === selectedShape) {
          if (shape.type === "path" && shape.path && originalShapePosition.path) {
            // Move all path points relative to original position
            const offsetX = newX - originalShapePosition.x;
            const offsetY = newY - originalShapePosition.y;
            return {
              ...shape,
              x: newX,
              y: newY,
              path: originalShapePosition.path.map(p => ({
                x: p.x + offsetX,
                y: p.y + offsetY,
              })),
            };
          }
          return {
            ...shape,
            x: newX,
            y: newY,
          };
        }
        return shape;
      }));
      return;
    }

    if (!isDrawing) return;

    const coords = getCanvasCoordinates(e);

    if (selectedTool === "square" && startPoint) {
      const width = snapToGrid(coords.x - startPoint.x);
      const height = snapToGrid(coords.y - startPoint.y);
      // Preview will be drawn in drawCanvas
    } else if (selectedTool === "freeform") {
      setCurrentPath([...currentPath, { x: snapToGrid(coords.x), y: snapToGrid(coords.y) }]);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isMoving) {
      setIsMoving(false);
      setMoveStart(null);
      setOriginalShapePosition(null);
      return;
    }

    if (!isDrawing) return;

    const coords = getCanvasCoordinates(e);

    if (selectedTool === "square" && startPoint) {
      const width = snapToGrid(coords.x - startPoint.x);
      const height = snapToGrid(coords.y - startPoint.y);
      
      if (Math.abs(width) > 5 && Math.abs(height) > 5) {
        const newShape: LayoutShape = {
          id: `rect-${Date.now()}`,
          type: "rectangle",
          x: Math.min(startPoint.x, startPoint.x + width),
          y: Math.min(startPoint.y, startPoint.y + height),
          width: Math.abs(width),
          height: Math.abs(height),
          fill: colors.background,
          stroke: colors.stroke,
          strokeWidth: 2,
        };
        setShapes([...shapes, newShape]);
      }
    } else if (selectedTool === "freeform" && currentPath.length > 2) {
      const newShape: LayoutShape = {
        id: `path-${Date.now()}`,
        type: "path",
        x: Math.min(...currentPath.map(p => p.x)),
        y: Math.min(...currentPath.map(p => p.y)),
        path: currentPath,
        fill: colors.background,
        stroke: colors.stroke,
        strokeWidth: 2,
      };
      setShapes([...shapes, newShape]);
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentPath([]);
  };

  const handleCopy = () => {
    if (selectedShape) {
      const shape = shapes.find(s => s.id === selectedShape);
      if (shape) {
        setCopiedShape({ ...shape, id: `copy-${Date.now()}` });
      }
    }
  };

  const handlePaste = () => {
    if (copiedShape) {
      const newShape = {
        ...copiedShape,
        id: `paste-${Date.now()}`,
        x: copiedShape.x + 50,
        y: copiedShape.y + 50,
      };
      setShapes([...shapes, newShape]);
    }
  };

  const handleDelete = () => {
    if (selectedShape) {
      setShapes(shapes.filter(s => s.id !== selectedShape));
      setSelectedShape(null);
    }
  };

  const handleSave = () => {
    onLayoutSave(shapes);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    if (confirm("¿Estás seguro de que quieres limpiar todo el layout?")) {
      setShapes([]);
      setSelectedShape(null);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
        handleCopy();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        handlePaste();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        handleDelete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedShape, copiedShape, shapes]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-4 bg-card border border-border rounded-lg flex-wrap">
        {/* Drawing Tools */}
        <div className="flex items-center gap-2 border-r border-border pr-2">
          <button
            onClick={() => {
              setSelectedTool("select");
              setSelectedIcon(null);
            }}
            className={`p-2 rounded ${selectedTool === "select" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            title="Seleccionar"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedTool("move");
              setSelectedIcon(null);
            }}
            className={`p-2 rounded ${selectedTool === "move" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            title="Mover (selecciona un objeto primero)"
            disabled={!selectedShape}
          >
            <Move className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedTool("square");
              setSelectedIcon(null);
            }}
            className={`p-2 rounded ${selectedTool === "square" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            title="Cuadrado"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedTool("freeform");
              setSelectedIcon(null);
            }}
            className={`p-2 rounded ${selectedTool === "freeform" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            title="Forma Libre"
          >
            <Pen className="w-4 h-4" />
          </button>
        </div>

        {/* Icons */}
        <div className="flex items-center gap-2 border-r border-border pr-2">
          <button
            onClick={() => {
              setSelectedIcon("front");
              setSelectedTool("select");
            }}
            className={`p-2 rounded ${selectedIcon === "front" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            title="Frente"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedIcon("rear");
              setSelectedTool("select");
            }}
            className={`p-2 rounded ${selectedIcon === "rear" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            title="Trasero"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedIcon("steering");
              setSelectedTool("select");
            }}
            className={`p-2 rounded ${selectedIcon === "steering" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            title="Timón"
          >
            <Navigation className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedIcon("floor1");
              setSelectedTool("select");
            }}
            className={`p-2 rounded ${selectedIcon === "floor1" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            title="1er Piso"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedIcon("floor2");
              setSelectedTool("select");
            }}
            className={`p-2 rounded ${selectedIcon === "floor2" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            title="2do Piso"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedIcon("stairs");
              setSelectedTool("select");
            }}
            className={`p-2 rounded ${selectedIcon === "stairs" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            title="Escalera"
          >
            <Layers className="w-4 h-4 rotate-90" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 border-r border-border pr-2">
          <button
            onClick={handleCopy}
            disabled={!selectedShape}
            className="p-2 rounded bg-muted disabled:opacity-50"
            title="Copiar (Ctrl+C)"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handlePaste}
            disabled={!copiedShape}
            className="p-2 rounded bg-muted disabled:opacity-50"
            title="Pegar (Ctrl+V)"
          >
            <Clipboard className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-2 border-r border-border pr-2">
          <button
            onClick={handleZoomOut}
            className="p-2 rounded bg-muted"
            title="Alejar"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-muted-foreground min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded bg-muted"
            title="Acercar"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Save & Clear */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className={`p-2 rounded transition-colors ${
              saved 
                ? "bg-green-500 text-white" 
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
            title="Guardar Layout"
          >
            <Save className="w-4 h-4" />
          </button>
          {saved && (
            <span className="text-xs text-green-600 font-medium">¡Guardado!</span>
          )}
          <button
            onClick={handleClear}
            className="p-2 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90"
            title="Limpiar Todo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative border border-border rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setIsDrawing(false);
            setIsPanning(false);
          }}
          className="cursor-crosshair"
          style={{
            width: "100%",
            height: "auto",
            maxHeight: "800px",
            display: "block",
          }}
        />
        <div className="absolute bottom-4 right-4 bg-background/90 border border-border rounded-lg p-2 text-xs text-muted-foreground">
          <p>Ctrl/Cmd + Click para mover canvas | {shapes.length} elementos dibujados</p>
          <p className="mt-1 text-[10px]">
            {selectedTool === "move" && selectedShape 
              ? "Modo mover: Arrastra para mover el objeto seleccionado"
              : selectedTool === "select"
              ? "Modo seleccionar: Haz clic en un objeto para seleccionarlo"
              : "Canvas en blanco - Dibuja la estructura del bus desde cero"}
          </p>
        </div>
      </div>
    </div>
  );
}

