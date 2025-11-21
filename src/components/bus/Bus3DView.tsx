"use client";

import { useMemo } from "react";

interface Bus3DViewProps {
  width: number;
  height: number;
  selectedFloor: 1 | 2;
  hasTwoFloors: boolean;
  className?: string;
}

// Bus dimensions (realistic proportions - longer than wide)
const BUS_LENGTH = 1200; // Length of the bus
const BUS_WIDTH = 400; // Width of the bus

export function Bus3DView({ 
  width, 
  height, 
  selectedFloor, 
  hasTwoFloors,
  className = "" 
}: Bus3DViewProps) {
  // Calculate bus position (centered)
  const busPosition = useMemo(() => {
    const centerX = width / 2;
    const centerY = height / 2;
    
    return {
      left: centerX - BUS_LENGTH / 2,
      top: centerY - BUS_WIDTH / 2,
    };
  }, [width, height]);

  return (
    <div className={`relative ${className}`} style={{ width: `${width}px`, height: `${height}px` }}>
      {/* This component is now just a placeholder - the actual 3D bus rendering is done in SeatMapEditor */}
      {/* The Bus3DView provides the structure, but the detailed rendering is in the main component */}
    </div>
  );
}

