import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface SeatAvailabilityUpdate {
  seatId: string;
  status: "available" | "sold" | "locked";
  lockedBy?: string;
  expiresAt?: Date;
}

export interface SeatAvailabilitySubscriber {
  onSeatSold: (seatId: string) => void;
  onSeatLocked: (seatId: string, lockedBy: string, expiresAt: Date) => void;
  onSeatUnlocked: (seatId: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Service for managing real-time seat availability updates
 * Handles seat locks, sales, and synchronization across POS, app, and website
 */
export class SeatAvailabilityService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscribers: Map<string, SeatAvailabilitySubscriber[]> = new Map();

  /**
   * Subscribe to real-time seat availability updates for a trip
   */
  subscribe(
    tripId: string,
    subscriber: SeatAvailabilitySubscriber
  ): () => void {
    const supabase = createClient();

    // Add subscriber
    if (!this.subscribers.has(tripId)) {
      this.subscribers.set(tripId, []);
    }
    this.subscribers.get(tripId)!.push(subscriber);

    // If channel already exists, return unsubscribe function
    if (this.channels.has(tripId)) {
      return () => {
        const subs = this.subscribers.get(tripId);
        if (subs) {
          const index = subs.indexOf(subscriber);
          if (index > -1) {
            subs.splice(index, 1);
          }
          // If no more subscribers, remove channel
          if (subs.length === 0) {
            const channel = this.channels.get(tripId);
            if (channel) {
              supabase.removeChannel(channel);
              this.channels.delete(tripId);
            }
            this.subscribers.delete(tripId);
          }
        }
      };
    }

    // Create new channel for this trip
    const channel = supabase
      .channel(`seat-availability-${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "seat_locks",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          this.handleSeatLockChange(tripId, payload);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          this.handleTicketChange(tripId, payload);
        }
      )
      .subscribe();

    this.channels.set(tripId, channel);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(tripId);
      if (subs) {
        const index = subs.indexOf(subscriber);
        if (index > -1) {
          subs.splice(index, 1);
        }
        // If no more subscribers, remove channel
        if (subs.length === 0) {
          const channel = this.channels.get(tripId);
          if (channel) {
            supabase.removeChannel(channel);
            this.channels.delete(tripId);
          }
          this.subscribers.delete(tripId);
        }
      }
    };
  }

  private handleSeatLockChange(tripId: string, payload: any) {
    const subscribers = this.subscribers.get(tripId) || [];

    if (payload.eventType === "INSERT") {
      const lock = payload.new as any;
      const expiresAt = new Date(lock.expires_at);
      subscribers.forEach((sub) => {
        try {
          sub.onSeatLocked(lock.seat_id, lock.locked_by, expiresAt);
        } catch (error) {
          sub.onError?.(error as Error);
        }
      });
    } else if (payload.eventType === "DELETE") {
      const lock = payload.old as any;
      subscribers.forEach((sub) => {
        try {
          sub.onSeatUnlocked(lock.seat_id);
        } catch (error) {
          sub.onError?.(error as Error);
        }
      });
    }
  }

  private handleTicketChange(tripId: string, payload: any) {
    const subscribers = this.subscribers.get(tripId) || [];

    if (payload.eventType === "INSERT") {
      const ticket = payload.new as any;
      // When a ticket is created, the seat is sold
      subscribers.forEach((sub) => {
        try {
          sub.onSeatSold(ticket.seat_id);
        } catch (error) {
          sub.onError?.(error as Error);
        }
      });
    }
  }

  /**
   * Lock a seat temporarily (15-30 seconds) while user is selecting
   */
  async lockSeat(
    tripId: string,
    seatId: string,
    duration: number = 30000 // 30 seconds default
  ): Promise<boolean> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User must be authenticated to lock seats");
    }

    const expiresAt = new Date(Date.now() + duration);

    const { error } = await supabase.from("seat_locks").upsert(
      {
        trip_id: tripId,
        seat_id: seatId,
        locked_by: user.id,
        expires_at: expiresAt.toISOString(),
      },
      {
        onConflict: "trip_id,seat_id",
      }
    );

    if (error) {
      console.error("Error locking seat:", error);
      return false;
    }

    return true;
  }

  /**
   * Unlock a seat (when user cancels selection or completes purchase)
   */
  async unlockSeat(tripId: string, seatId: string): Promise<boolean> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    const { error } = await supabase
      .from("seat_locks")
      .delete()
      .eq("trip_id", tripId)
      .eq("seat_id", seatId)
      .eq("locked_by", user.id); // Only unlock own locks

    if (error) {
      console.error("Error unlocking seat:", error);
      return false;
    }

    return true;
  }

  /**
   * Cleanup: Remove all channels and subscribers
   */
  cleanup() {
    const supabase = createClient();
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.subscribers.clear();
  }
}

// Singleton instance
export const seatAvailabilityService = new SeatAvailabilityService();

