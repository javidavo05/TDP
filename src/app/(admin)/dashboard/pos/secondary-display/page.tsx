"use client";

import { useEffect, useState } from "react";
import { SeatSelectorView } from "@/components/pos/SeatSelectorView";
import { AdvertisingDisplay } from "@/components/pos/AdvertisingDisplay";
import { createClient } from "@/lib/supabase/client";

type DisplayMode = "advertising" | "seat-selection";

interface DisplayState {
  mode: DisplayMode;
  tripId?: string;
  busId?: string;
  availableSeats?: number;
  totalSeats?: number;
  selectedSeatId?: string | null;
  selectedSeatIds?: string[]; // Support multiple selected seats
}

interface AdvertisingItem {
  id: string;
  type: "image" | "video";
  url: string;
  duration?: number;
}

export default function SecondaryDisplayPage() {
  const [displayState, setDisplayState] = useState<DisplayState>({
    mode: "advertising",
  });
  const [advertisingItems, setAdvertisingItems] = useState<AdvertisingItem[]>([]);
  const [defaultImageUrl, setDefaultImageUrl] = useState<string>("");
  const supabase = createClient();

  useEffect(() => {
    // Fetch advertising items and default image
    const fetchAdvertising = async () => {
      try {
        const { data, error } = await supabase
          .from("advertising_items")
          .select("*")
          .order("order", { ascending: true });

        if (error) {
          console.error("Error fetching advertising:", error);
          return;
        }

        setAdvertisingItems(
          (data || []).map((item) => ({
            id: item.id,
            type: item.type,
            url: item.url,
            duration: item.duration,
          }))
        );
      } catch (error) {
        console.error("Error fetching advertising:", error);
      }
    };

    const fetchDefaultImage = async () => {
      try {
        const { data, error } = await supabase
          .from("advertising_settings")
          .select("default_image_url")
          .single();

        if (error && error.code !== "PGRST116") {
          // PGRST116 = no rows returned, which is fine
          console.error("Error fetching default image:", error);
          return;
        }

        if (data) {
          setDefaultImageUrl(data.default_image_url || "");
        }
      } catch (error) {
        console.error("Error fetching default image:", error);
      }
    };

    fetchAdvertising();
    fetchDefaultImage();

    // Subscribe to changes in advertising items
    const channel = supabase
      .channel("advertising-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "advertising_items",
        },
        () => {
          fetchAdvertising();
        }
      )
      .subscribe();

    // Listen for messages from the main POS tab
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "pos-secondary-display") {
        try {
          const newState = JSON.parse(e.newValue || "{}") as DisplayState;
          setDisplayState(newState);
        } catch (error) {
          console.error("Error parsing display state:", error);
        }
      }
    };

    // Also listen to BroadcastChannel for faster communication
    const broadcastChannel = new BroadcastChannel("pos-secondary-display");
    broadcastChannel.onmessage = (event) => {
      setDisplayState(event.data as DisplayState);
    };

    // Initial load from localStorage
    const stored = localStorage.getItem("pos-secondary-display");
    if (stored) {
      try {
        const state = JSON.parse(stored) as DisplayState;
        setDisplayState(state);
      } catch (error) {
        console.error("Error parsing initial display state:", error);
      }
    }

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      broadcastChannel.close();
      supabase.removeChannel(channel);
    };
  }, []);

  // Show seat selection when modal is open in main POS, otherwise show advertising
  if (displayState.mode === "seat-selection" && displayState.tripId && displayState.busId) {
    return (
      <div className="h-screen w-screen bg-background overflow-hidden">
        <SeatSelectorView
          tripId={displayState.tripId}
          busId={displayState.busId}
          availableSeats={displayState.availableSeats || 0}
          totalSeats={displayState.totalSeats || 0}
          selectedSeatId={displayState.selectedSeatId || null}
          selectedSeatIds={displayState.selectedSeatIds || []}
          onSelect={() => {
            // Seat selection is handled in the main POS modal
            // This view is just for display purposes
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-background overflow-hidden p-0">
      <AdvertisingDisplay 
        items={advertisingItems} 
        defaultImageUrl={defaultImageUrl}
        className="h-full w-full rounded-none" 
      />
    </div>
  );
}

