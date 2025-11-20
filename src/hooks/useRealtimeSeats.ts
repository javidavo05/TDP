"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface SeatLock {
  seatId: string;
  tripId: string;
  lockedBy: string;
  lockedAt: Date;
  expiresAt: Date;
}

export function useRealtimeSeats(tripId: string | null) {
  const [lockedSeats, setLockedSeats] = useState<Set<string>>(new Set());
  const [seatLocks, setSeatLocks] = useState<Map<string, SeatLock>>(new Map());

  useEffect(() => {
    if (!tripId) return;

    const supabase = createClient();

    // Subscribe to seat locks for this trip
    const channel = supabase
      .channel(`seat-locks-${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "seat_locks",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const lock = payload.new as any;
            setLockedSeats((prev) => new Set([...prev, lock.seat_id]));
            setSeatLocks((prev) => {
              const next = new Map(prev);
              next.set(lock.seat_id, {
                seatId: lock.seat_id,
                tripId: lock.trip_id,
                lockedBy: lock.locked_by,
                lockedAt: new Date(lock.locked_at),
                expiresAt: new Date(lock.expires_at),
              });
              return next;
            });
          } else if (payload.eventType === "DELETE") {
            const lock = payload.old as any;
            setLockedSeats((prev) => {
              const next = new Set(prev);
              next.delete(lock.seat_id);
              return next;
            });
            setSeatLocks((prev) => {
              const next = new Map(prev);
              next.delete(lock.seat_id);
              return next;
            });
          }
        }
      )
      .subscribe();

    // Cleanup expired locks periodically
    const cleanupInterval = setInterval(() => {
      const now = new Date();
      setSeatLocks((prev) => {
        const next = new Map();
        prev.forEach((lock, seatId) => {
          if (lock.expiresAt > now) {
            next.set(seatId, lock);
          } else {
            setLockedSeats((current) => {
              const updated = new Set(current);
              updated.delete(seatId);
              return updated;
            });
          }
        });
        return next;
      });
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(cleanupInterval);
    };
  }, [tripId]);

  const lockSeat = async (seatId: string, duration: number = 300000) => {
    if (!tripId) return false;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const expiresAt = new Date(Date.now() + duration);

    const { error } = await supabase.from("seat_locks").insert({
      trip_id: tripId,
      seat_id: seatId,
      locked_by: user.id,
      expires_at: expiresAt.toISOString(),
    });

    return !error;
  };

  const unlockSeat = async (seatId: string) => {
    if (!tripId) return false;

    const supabase = createClient();
    const { error } = await supabase
      .from("seat_locks")
      .delete()
      .eq("trip_id", tripId)
      .eq("seat_id", seatId);

    return !error;
  };

  return {
    lockedSeats: Array.from(lockedSeats),
    seatLocks,
    lockSeat,
    unlockSeat,
  };
}

