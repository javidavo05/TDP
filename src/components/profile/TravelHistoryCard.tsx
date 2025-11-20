"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";

interface TravelHistoryCardProps {
  ticket: {
    id: string;
    trip?: {
      route?: {
        origin: string;
        destination: string;
      };
      departureTime?: Date;
    };
    seat?: {
      number: string;
    };
    status: string;
    createdAt: Date;
  };
}

export function TravelHistoryCard({ ticket }: TravelHistoryCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-lg animate-fadeInUp">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {ticket.trip?.route && (
            <div className="mb-2">
              <span className="text-lg font-semibold">{ticket.trip.route.origin}</span>
              <span className="mx-2 text-muted-foreground">→</span>
              <span className="text-lg font-semibold">{ticket.trip.route.destination}</span>
            </div>
          )}
          {ticket.trip?.departureTime && (
            <p className="text-sm text-muted-foreground">
              {format(new Date(ticket.trip.departureTime), "d 'de' MMMM, yyyy 'a las' HH:mm", {
                locale: es,
              })}
            </p>
          )}
          {ticket.seat && (
            <p className="text-sm text-muted-foreground mt-1">
              Asiento: <span className="font-semibold">{ticket.seat.number}</span>
            </p>
          )}
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            ticket.status === "completed"
              ? "bg-success/10 text-success"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {ticket.status === "completed" ? "Completado" : ticket.status}
        </span>
      </div>
    </div>
  );
}

