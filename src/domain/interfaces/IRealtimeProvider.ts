import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export interface RealtimeSubscription {
  unsubscribe: () => void;
}

export type PostgresChangeEvent = "*" | "INSERT" | "UPDATE" | "DELETE";

export interface RealtimeSubscribeParams {
  channel?: string;
  schema?: string;
  table: string;
  event?: PostgresChangeEvent;
  filter?: string;
}

export interface IRealtimeProvider {
  subscribe<T extends Record<string, any>>(
    params: RealtimeSubscribeParams,
    callback: (payload: RealtimePostgresChangesPayload<T>) => void
  ): RealtimeSubscription;

  publish<T>(channel: string, event: string, payload: T): Promise<void>;

  isConnected(): boolean;
}

