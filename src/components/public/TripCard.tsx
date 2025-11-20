"use client";

import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface TripCardProps {
  trip: {
    id: string;
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    price: number;
    availableSeats: number;
    totalSeats: number;
    busClass?: string;
    bus?: {
      features?: {
        wifi?: boolean;
        ac?: boolean;
        bathroom?: boolean;
      };
    };
  };
}

export function TripCard({ trip }: TripCardProps) {
  const occupancyPercentage = (trip.availableSeats / trip.totalSeats) * 100;
  const isLowAvailability = occupancyPercentage < 20;
  const isAlmostFull = occupancyPercentage < 10;

  const formatTime = (time: string) => {
    return format(new Date(time), "HH:mm", { locale: es });
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "EEEE, d 'de' MMMM", { locale: es });
  };

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="block group"
    >
      <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg hover-lift transition-all duration-300">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulseGlow" />
                <span className="text-sm font-medium text-primary">
                  {trip.busClass || "Económico"}
                </span>
              </div>
              {trip.bus?.features?.wifi && (
                <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                  WiFi
                </span>
              )}
              {trip.bus?.features?.ac && (
                <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                  A/C
                </span>
              )}
            </div>
            <h3 className="text-xl font-semibold text-foreground">
              {trip.origin} → {trip.destination}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDate(trip.departureTime)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              ${trip.price.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">por persona</div>
          </div>
        </div>

        {/* Schedule */}
        <div className="flex items-center gap-4 py-4 border-y border-border">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground mb-1">Salida</div>
            <div className="text-lg font-semibold">{formatTime(trip.departureTime)}</div>
            <div className="text-xs text-muted-foreground">{trip.origin}</div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-px w-8 bg-border" />
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div className="h-px w-8 bg-border" />
          </div>
          <div className="flex-1 text-right">
            <div className="text-sm text-muted-foreground mb-1">Llegada</div>
            <div className="text-lg font-semibold">{formatTime(trip.arrivalTime)}</div>
            <div className="text-xs text-muted-foreground">{trip.destination}</div>
          </div>
        </div>

        {/* Availability */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isAlmostFull
                    ? "bg-destructive"
                    : isLowAvailability
                    ? "bg-warning"
                    : "bg-primary"
                }`}
                style={{ width: `${occupancyPercentage}%` }}
              />
            </div>
            <span
              className={`text-sm font-medium ${
                isAlmostFull
                  ? "text-destructive"
                  : isLowAvailability
                  ? "text-warning"
                  : "text-muted-foreground"
              }`}
            >
              {trip.availableSeats} disponibles
            </span>
          </div>
          <div className="flex items-center gap-2 text-primary group-hover:gap-3 transition-all">
            <span className="text-sm font-medium">Ver detalles</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}

