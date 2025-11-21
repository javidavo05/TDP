"use client";

import { TouchButton } from "./TouchButton";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Bus, Users } from "lucide-react";

interface AssignedBus {
  id: string;
  plateNumber: string;
  unitNumber: string | null;
  capacity: number;
}

interface Schedule {
  id: string;
  hour: number;
  hourFormatted: string;
  routeId: string;
  routeName: string;
  origin: string;
  destination: string;
  isExpress: boolean;
  price: number;
  basePrice: number;
  assignedBuses: AssignedBus[];
  availableSeats: number;
  totalSeats: number;
  hasTrips: boolean;
  tripIds: string[];
  hasAssignedBuses?: boolean;
  date?: string;
}

interface ScheduleGridProps {
  schedules: Schedule[];
  selectedScheduleId: string | null;
  onSelectSchedule: (schedule: Schedule) => void;
  loading?: boolean;
}

export function ScheduleGrid({
  schedules,
  selectedScheduleId,
  onSelectSchedule,
  loading = false,
}: ScheduleGridProps) {
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

  if (schedules.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">No hay horarios disponibles</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {schedules.map((schedule) => {
        const isSelected = selectedScheduleId === schedule.id;
        const hasBuses = schedule.assignedBuses.length > 0;
        // Available if has buses assigned (trips will be created on sale if needed)
        const isAvailable = hasBuses && (schedule.availableSeats > 0 || !schedule.hasTrips);

        return (
          <TouchButton
            key={schedule.id}
            onClick={() => onSelectSchedule(schedule)}
            variant={isSelected ? "primary" : "secondary"}
            size="lg"
            className={`h-auto min-h-[120px] p-4 flex flex-col justify-between text-left ${
              !isAvailable ? "opacity-60" : ""
            }`}
            disabled={!isAvailable}
          >
            <div className="w-full">
              {/* Header: Hour and Express Badge */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">{schedule.hourFormatted}</span>
                </div>
                {schedule.isExpress && (
                  <Badge variant="default" className="bg-warning text-warning-foreground">
                    Expreso
                  </Badge>
                )}
              </div>

              {/* Route */}
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-base font-semibold">{schedule.routeName}</span>
              </div>

              {/* Price */}
              <div className="text-2xl font-bold text-primary mb-2">
                ${schedule.price.toFixed(2)}
              </div>

              {/* Buses */}
              {hasBuses ? (
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Bus className="h-4 w-4 text-muted-foreground" />
                  <div className="flex gap-1 flex-wrap">
                    {schedule.assignedBuses.map((bus, idx) => (
                      <Badge
                        key={bus.id}
                        variant="outline"
                        className="text-xs"
                      >
                        {bus.unitNumber || bus.plateNumber}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground mb-2">
                  Sin buses asignados
                </div>
              )}

              {/* Available Seats */}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {schedule.hasTrips 
                    ? `${schedule.availableSeats} / ${schedule.totalSeats} disponibles`
                    : `${schedule.totalSeats} asientos disponibles`}
                </span>
              </div>
              {!schedule.hasTrips && (schedule as any).hasAssignedBuses && (
                <div className="text-xs text-muted-foreground mt-1">
                  Trip se creará al momento de la venta
                </div>
              )}
            </div>
          </TouchButton>
        );
      })}
    </div>
  );
}

