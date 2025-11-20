import { IRealtimeProvider, RealtimeSubscription } from "@/domain/interfaces";
import { createClient } from "@/lib/supabase/client";

type PostgresChangeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export class SupabaseRealtimeAdapter implements IRealtimeProvider {
  private supabase = createClient();

  subscribe<T>(
    channel: string,
    event: string,
    callback: (payload: T) => void
  ): RealtimeSubscription {
    const channelInstance = this.supabase.channel(channel);

    channelInstance.on(
      "postgres_changes",
      { event: (event as PostgresChangeEvent) || "*", schema: "public", table: channel },
      (payload) => {
        callback(payload.new as T);
      }
    );

    channelInstance.subscribe();

    return {
      unsubscribe: () => {
        this.supabase.removeChannel(channelInstance);
      },
    };
  }

  async publish<T>(channel: string, event: string, payload: T): Promise<void> {
    const channelInstance = this.supabase.channel(channel);
    await channelInstance.send({
      type: "broadcast",
      event,
      payload,
    });
  }

  isConnected(): boolean {
    // Supabase realtime connection status
    return true; // Simplified - in production, check actual connection status
  }
}

