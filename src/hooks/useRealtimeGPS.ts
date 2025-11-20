"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface GPSPosition {
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  timestamp: Date;
}

export function useRealtimeGPS(tripId: string | null) {
  const [position, setPosition] = useState<GPSPosition | null>(null);
  const [eta, setEta] = useState<number | null>(null);

  useEffect(() => {
    if (!tripId) return;

    const supabase = createClient();

    // Subscribe to GPS updates for this trip
    const channel = supabase
      .channel(`gps-${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gps_logs",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          const log = payload.new as any;
          setPosition({
            latitude: log.latitude,
            longitude: log.longitude,
            speed: log.speed,
            heading: log.heading,
            timestamp: new Date(log.timestamp),
          });
        }
      )
      .subscribe();

    // Fetch latest position on mount
    const fetchLatestPosition = async () => {
      const { data, error } = await supabase
        .from("gps_logs")
        .select("*")
        .eq("trip_id", tripId)
        .order("timestamp", { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setPosition({
          latitude: data.latitude,
          longitude: data.longitude,
          speed: data.speed,
          heading: data.heading,
          timestamp: new Date(data.timestamp),
        });
      }
    };

    fetchLatestPosition();

    // Fetch ETA periodically
    const etaInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/gps/trips/${tripId}/eta`);
        if (response.ok) {
          const data = await response.json();
          setEta(data.eta);
        }
      } catch (error) {
        console.error("Error fetching ETA:", error);
      }
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(etaInterval);
    };
  }, [tripId]);

  return { position, eta };
}

