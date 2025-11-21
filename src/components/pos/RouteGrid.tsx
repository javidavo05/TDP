"use client";

import { TouchButton } from "./TouchButton";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign } from "lucide-react";

interface Route {
  id: string;
  name: string;
  origin: string;
  destination: string;
  basePrice: number;
  isExpress: boolean;
  expressPriceMultiplier: number;
  isActive: boolean;
  routeLabel: string;
}

interface RouteGridProps {
  routes: Route[];
  selectedRouteId: string | null;
  onSelectRoute: (route: Route) => void;
  loading?: boolean;
}

export function RouteGrid({
  routes,
  selectedRouteId,
  onSelectRoute,
  loading = false,
}: RouteGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-32 bg-muted rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">No hay rutas disponibles</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {routes.map((route) => {
        const isSelected = selectedRouteId === route.id;

        return (
          <TouchButton
            key={route.id}
            onClick={() => onSelectRoute(route)}
            variant={isSelected ? "primary" : "secondary"}
            size="lg"
            className={`h-auto min-h-[120px] p-4 flex flex-col justify-between text-left ${
              !route.isActive ? "opacity-60" : ""
            }`}
            disabled={!route.isActive}
          >
            <div className="w-full">
              {/* Route Name */}
              <div className="text-xl font-bold mb-2">{route.name}</div>

              {/* Origin → Destination */}
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold">{route.routeLabel}</span>
              </div>

              {/* Price */}
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold text-primary">
                  ${route.basePrice.toFixed(2)}
                </span>
              </div>

              {/* Express Badge */}
              {route.isExpress && (
                <Badge variant="default" className="bg-warning text-warning-foreground mt-2">
                  Expreso (x{route.expressPriceMultiplier.toFixed(1)})
                </Badge>
              )}

              {/* Status */}
              {!route.isActive && (
                <Badge variant="outline" className="mt-2 text-destructive">
                  Inactiva
                </Badge>
              )}
            </div>
          </TouchButton>
        );
      })}
    </div>
  );
}

