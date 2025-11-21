import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface TripSyncCallbacks {
  onTripCreated?: (trip: any) => void;
  onTripUpdated?: (trip: any) => void;
  onTripDeleted?: (tripId: string) => void;
  onTicketCreated?: (ticket: any) => void;
  onTicketUpdated?: (ticket: any) => void;
  onTicketDeleted?: (ticketId: string) => void;
  onAssignmentCreated?: (assignment: any) => void;
  onAssignmentUpdated?: (assignment: any) => void;
  onError?: (error: Error) => void;
}

export class TripSyncService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private supabase = createClient();

  /**
   * Subscribe to trip and ticket changes for real-time synchronization
   * @param callbacks - Callbacks for different events
   * @param filters - Optional filters (e.g., specific dates, routes)
   * @returns Cleanup function to unsubscribe
   */
  subscribe(
    callbacks: TripSyncCallbacks,
    filters?: {
      dateRange?: { start: Date; end: Date };
      routeIds?: string[];
    }
  ): () => void {
    // Subscribe to trips changes
    const tripsChannel = this.supabase
      .channel(`trips-sync-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trips",
        },
        (payload) => {
          try {
            if (payload.eventType === "INSERT") {
              callbacks.onTripCreated?.(payload.new);
            } else if (payload.eventType === "UPDATE") {
              callbacks.onTripUpdated?.(payload.new);
            } else if (payload.eventType === "DELETE") {
              callbacks.onTripDeleted?.(payload.old.id);
            }
          } catch (error) {
            callbacks.onError?.(error as Error);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
        },
        (payload) => {
          try {
            if (payload.eventType === "INSERT") {
              callbacks.onTicketCreated?.(payload.new);
            } else if (payload.eventType === "UPDATE") {
              callbacks.onTicketUpdated?.(payload.new);
            } else if (payload.eventType === "DELETE") {
              callbacks.onTicketDeleted?.(payload.old.id);
            }
          } catch (error) {
            callbacks.onError?.(error as Error);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "schedule_assignments",
        },
        (payload) => {
          try {
            if (payload.eventType === "INSERT") {
              callbacks.onAssignmentCreated?.(payload.new);
            } else if (payload.eventType === "UPDATE") {
              callbacks.onAssignmentUpdated?.(payload.new);
            }
          } catch (error) {
            callbacks.onError?.(error as Error);
          }
        }
      )
      .subscribe();

    this.channels.set(`trips-sync-${Date.now()}`, tripsChannel);

    // Return cleanup function
    return () => {
      this.channels.forEach((channel) => {
        this.supabase.removeChannel(channel);
      });
      this.channels.clear();
    };
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribe(): void {
    this.channels.forEach((channel) => {
      this.supabase.removeChannel(channel);
    });
    this.channels.clear();
  }
}

// Singleton instance
let syncServiceInstance: TripSyncService | null = null;

export function getTripSyncService(): TripSyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new TripSyncService();
  }
  return syncServiceInstance;
}

