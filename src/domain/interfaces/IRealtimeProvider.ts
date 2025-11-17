export interface RealtimeSubscription {
  unsubscribe: () => void;
}

export interface IRealtimeProvider {
  subscribe<T>(
    channel: string,
    event: string,
    callback: (payload: T) => void
  ): RealtimeSubscription;
  
  publish<T>(channel: string, event: string, payload: T): Promise<void>;
  
  isConnected(): boolean;
}

