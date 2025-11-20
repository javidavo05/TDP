"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface QRValidation {
  ticketId: string;
  validatedBy: string;
  validatedAt: Date;
  status: "validated" | "invalid";
}

export function useRealtimeQRValidation(tripId: string | null) {
  const [validations, setValidations] = useState<Map<string, QRValidation>>(new Map());

  useEffect(() => {
    if (!tripId) return;

    const supabase = createClient();

    // Subscribe to ticket validations for this trip
    const channel = supabase
      .channel(`qr-validations-${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tickets",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          const ticket = payload.new as any;
          if (ticket.status === "boarded") {
            setValidations((prev) => {
              const next = new Map(prev);
              next.set(ticket.id, {
                ticketId: ticket.id,
                validatedBy: ticket.validated_by || "unknown",
                validatedAt: new Date(ticket.boarded_at || Date.now()),
                status: "validated",
              });
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  return { validations: Array.from(validations.values()) };
}

