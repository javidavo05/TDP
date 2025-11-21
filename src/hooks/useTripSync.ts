import { useEffect, useRef } from "react";
import { getTripSyncService, TripSyncCallbacks } from "@/services/sync/TripSyncService";

export interface UseTripSyncOptions {
  onTripCreated?: (trip: any) => void;
  onTripUpdated?: (trip: any) => void;
  onTripDeleted?: (tripId: string) => void;
  onTicketCreated?: (ticket: any) => void;
  onTicketUpdated?: (ticket: any) => void;
  onTicketDeleted?: (ticketId: string) => void;
  onAssignmentCreated?: (assignment: any) => void;
  onAssignmentUpdated?: (assignment: any) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

/**
 * Hook para sincronización en tiempo real de trips y tickets
 * Se suscribe automáticamente a cambios en la base de datos
 */
export function useTripSync(options: UseTripSyncOptions = {}) {
  const {
    onTripCreated,
    onTripUpdated,
    onTripDeleted,
    onTicketCreated,
    onTicketUpdated,
    onTicketDeleted,
    onAssignmentCreated,
    onAssignmentUpdated,
    onError,
    enabled = true,
  } = options;

  const callbacksRef = useRef<TripSyncCallbacks>({});

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = {
      onTripCreated,
      onTripUpdated,
      onTripDeleted,
      onTicketCreated,
      onTicketUpdated,
      onTicketDeleted,
      onAssignmentCreated,
      onAssignmentUpdated,
      onError,
    };
  }, [
    onTripCreated,
    onTripUpdated,
    onTripDeleted,
    onTicketCreated,
    onTicketUpdated,
    onTicketDeleted,
    onAssignmentCreated,
    onAssignmentUpdated,
    onError,
  ]);

  useEffect(() => {
    if (!enabled) return;

    const syncService = getTripSyncService();
    const cleanup = syncService.subscribe(callbacksRef.current);

    return cleanup;
  }, [enabled]);
}

