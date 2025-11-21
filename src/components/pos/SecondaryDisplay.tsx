"use client";

import { AdvertisingDisplay } from "./AdvertisingDisplay";
import { SeatSelectorView } from "./SeatSelectorView";

type SecondaryDisplayMode = "advertising" | "seat-selection";

interface SecondaryDisplayProps {
  mode: SecondaryDisplayMode;
  // Advertising props
  advertisingImages?: string[];
  // Seat selection props
  tripId?: string;
  busId?: string;
  availableSeats?: number;
  totalSeats?: number;
  onSeatSelect?: (seatId: string) => void;
  onCloseSeatSelection?: () => void;
  className?: string;
}

export function SecondaryDisplay({
  mode,
  advertisingImages = [],
  tripId,
  busId,
  availableSeats = 0,
  totalSeats = 0,
  onSeatSelect,
  onCloseSeatSelection,
  className = "",
}: SecondaryDisplayProps) {
  if (mode === "seat-selection" && tripId && busId) {
    return (
      <div className={`w-full h-full bg-background p-6 overflow-auto ${className}`}>
        <SeatSelectorView
          tripId={tripId}
          busId={busId}
          availableSeats={availableSeats}
          totalSeats={totalSeats}
          onSelect={onSeatSelect || (() => {})}
        />
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <AdvertisingDisplay items={advertisingImages.map((url, index) => ({ id: `img-${index}`, type: 'image' as const, url, duration: 5000 }))} />
    </div>
  );
}

