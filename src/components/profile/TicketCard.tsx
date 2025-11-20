"use client";

import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface TicketCardProps {
  ticket: {
    id: string;
    qrCode: string;
    passengerName: string;
    status: string;
    price: number;
    totalPrice: number;
    createdAt: Date;
    trip?: {
      route?: {
        origin?: string;
        destination?: string;
      };
      origin?: string;
      destination?: string;
      departureTime?: string | Date;
    };
    seat?: {
      number?: string;
    };
  };
}

export function TicketCard({ ticket }: TicketCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-success/10 text-success border-success/20";
      case "boarded":
        return "bg-primary/10 text-primary border-primary/20";
      case "completed":
        return "bg-muted text-muted-foreground border-border";
      case "cancelled":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-warning/10 text-warning border-warning/20";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "paid":
        return "Pagado";
      case "boarded":
        return "Abordado";
      case "completed":
        return "Completado";
      case "cancelled":
        return "Cancelado";
      default:
        return "Pendiente";
    }
  };

  return (
    <Link
      href={`/tickets/${ticket.id}`}
      className="block bg-card border border-border rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover-lift animate-fadeInUp"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-foreground">
              {ticket.trip?.route?.origin || ticket.trip?.origin || "N/A"} → {ticket.trip?.route?.destination || ticket.trip?.destination || "N/A"}
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(ticket.status)}`}
            >
              {getStatusText(ticket.status)}
            </span>
          </div>
          {ticket.trip?.departureTime && (
            <p className="text-sm text-muted-foreground">
              {format(new Date(ticket.trip.departureTime), "EEEE, d 'de' MMMM 'a las' HH:mm", { locale: es })}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">
            ${ticket.totalPrice.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">USD</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Asiento</p>
          <p className="font-semibold">{ticket.seat?.number || "N/A"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Código</p>
          <p className="font-mono text-sm">{ticket.qrCode}</p>
        </div>
      </div>
    </Link>
  );
}
