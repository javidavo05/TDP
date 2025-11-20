import {
  IRealtimeProvider,
  RealtimeSubscribeParams,
  RealtimeSubscription,
} from "@/domain/interfaces";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import type { RealtimePostgresChangesFilter } from "@supabase/realtime-js";

const DEFAULT_SCHEMA = "public";
const DEFAULT_EVENT = "*";

export class SupabaseRealtimeAdapter implements IRealtimeProvider {
  private supabase = createClient();

  subscribe<T extends Record<string, any>>(
    params: RealtimeSubscribeParams,
    callback: (payload: RealtimePostgresChangesPayload<T>) => void
  ): RealtimeSubscription {
    const {
      channel,
      schema = DEFAULT_SCHEMA,
      table,
      event = DEFAULT_EVENT,
      filter,
    } = params;

    const channelName = channel ?? this.buildChannelName(schema, table, event, filter);
    const channelInstance = this.supabase.channel(channelName);

    const filterConfig: RealtimePostgresChangesFilter<any> = {
      event: event.toUpperCase(),
      schema,
      table,
      ...(filter ? { filter } : {}),
    };

    channelInstance.on(
      "postgres_changes",
      filterConfig,
      (payload) => {
        if (this.isPostgresPayload<T>(payload)) {
          callback(payload);
        }
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
    return true;
  }

  private buildChannelName(schema: string, table: string, event: string, filter?: string) {
    const filterSuffix = filter ? `:${filter}` : "";
    return `postgres:${schema}:${table}:${event}${filterSuffix}`;
  }

  private isPostgresPayload<T extends Record<string, any>>(
    payload: unknown
  ): payload is RealtimePostgresChangesPayload<T> {
    return Boolean(
      payload &&
        typeof payload === "object" &&
        "eventType" in payload &&
        ("new" in payload || "old" in payload)
    );
  }
}

