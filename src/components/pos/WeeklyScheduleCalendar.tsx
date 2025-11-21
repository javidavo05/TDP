"use client";

import { useState, useEffect, useRef } from "react";
import { TouchButton } from "./TouchButton";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, MapPin, Bus, Users } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface RouteStop {
  id: string;
  name: string;
  price: number;
  orderIndex: number;
}

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
  minPrice?: number;
  maxPrice?: number;
  stops?: RouteStop[];
  assignedBuses: AssignedBus[];
  availableSeats: number;
  totalSeats: number;
  hasTrips: boolean;
  tripIds: string[];
  hasAssignedBuses?: boolean;
  date?: string;
}

interface WeeklyScheduleCalendarProps {
  schedules: Schedule[];
  selectedScheduleId: string | null;
  onSelectSchedule: (schedule: Schedule) => void;
  loading?: boolean;
  initialDate?: string;
}

interface ScheduleDetailModalProps {
  schedules: Schedule[];
  hour: number;
  date: Date;
  onClose: () => void;
  onSelect: (schedule: Schedule) => void;
}

function ScheduleDetailModal({ schedules, hour, date, onClose, onSelect }: ScheduleDetailModalProps) {
  if (schedules.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-card border-2 border-border rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold">
            Horarios {hour.toString().padStart(2, "0")}:00 - {format(date, "EEEE, d 'de' MMMM", { locale: es })}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="border-2 border-border rounded-xl p-4 hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <span className="text-xl font-bold">{schedule.routeName}</span>
                    {schedule.isExpress && (
                      <Badge variant="default" className="bg-warning text-warning-foreground">
                        Expreso
                      </Badge>
                    )}
                  </div>
                  
                  {schedule.stops && schedule.stops.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-muted-foreground mb-2">
                        Paradas disponibles:
                      </div>
                      {schedule.stops.map((stop) => (
                        <div
                          key={stop.id}
                          className="flex items-center justify-between p-2 bg-muted rounded-lg"
                        >
                          <span className="font-medium">{stop.name}</span>
                          <span className="text-lg font-bold text-primary">
                            ${stop.price.toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {schedule.minPrice !== undefined && schedule.maxPrice !== undefined && 
                       schedule.minPrice !== schedule.maxPrice && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Rango: ${schedule.minPrice.toFixed(2)} - ${schedule.maxPrice.toFixed(2)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-2xl font-bold text-primary mb-2">
                      ${schedule.price.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 mb-3 text-sm">
                <div className="flex items-center gap-2">
                  <Bus className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {schedule.assignedBuses.map(b => b.unitNumber || b.plateNumber).join(", ")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {schedule.hasTrips 
                      ? `${schedule.availableSeats} / ${schedule.totalSeats} disponibles`
                      : `${schedule.totalSeats} asientos disponibles`}
                  </span>
                </div>
              </div>

              <TouchButton
                onClick={() => {
                  onSelect(schedule);
                  onClose();
                }}
                variant="primary"
                size="md"
                className="w-full"
              >
                Seleccionar este horario
              </TouchButton>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WeeklyScheduleCalendar({
  schedules,
  selectedScheduleId,
  onSelectSchedule,
  loading = false,
  initialDate,
}: WeeklyScheduleCalendarProps) {
  // Calculate week start (Sunday)
  const getWeekStart = (date: Date) => {
    return startOfWeek(date, { weekStartsOn: 0 }); // 0 = Sunday
  };

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    if (initialDate) {
      return getWeekStart(parseISO(initialDate));
    }
    return getWeekStart(new Date());
  });

  const [selectedCell, setSelectedCell] = useState<{ hour: number; date: Date } | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Generate days of week (Sunday to Saturday)
  const daysOfWeek = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(currentWeekStart, i);
    return day;
  });

  // Group schedules by hour and date
  // Use UTC dates consistently to match how trips are created
  const schedulesByHourAndDate = new Map<string, Schedule[]>();
  schedules.forEach((schedule) => {
    if (!schedule.date) return;
    // schedule.date is already in yyyy-MM-dd format (UTC date string)
    const key = `${schedule.hour}-${schedule.date}`;
    if (!schedulesByHourAndDate.has(key)) {
      schedulesByHourAndDate.set(key, []);
    }
    schedulesByHourAndDate.get(key)!.push(schedule);
  });

  const getSchedulesForCell = (hour: number, date: Date): Schedule[] => {
    // Convert local date to UTC date string (yyyy-MM-dd) for comparison
    const utcYear = date.getUTCFullYear();
    const utcMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
    const utcDay = String(date.getUTCDate()).padStart(2, "0");
    const utcDateStr = `${utcYear}-${utcMonth}-${utcDay}`;
    const key = `${hour}-${utcDateStr}`;
    return schedulesByHourAndDate.get(key) || [];
  };

  const handlePreviousWeek = () => {
    setCurrentWeekStart((prev) => addWeeks(prev, -1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart((prev) => addWeeks(prev, 1));
  };

  // Swipe handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNextWeek();
    }
    if (isRightSwipe) {
      handlePreviousWeek();
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-lg text-muted-foreground">Cargando horarios...</div>
      </div>
    );
  }

  const selectedCellSchedules = selectedCell
    ? getSchedulesForCell(selectedCell.hour, selectedCell.date)
    : [];

  return (
    <div className="w-full">
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-4">
        <TouchButton
          onClick={handlePreviousWeek}
          variant="secondary"
          size="md"
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Semana Anterior
        </TouchButton>

        <div className="text-center">
          <div className="text-xl font-bold">
            {format(currentWeekStart, "d 'de' MMMM", { locale: es })} -{" "}
            {format(addDays(currentWeekStart, 6), "d 'de' MMMM", { locale: es })}
          </div>
          <div className="text-sm text-muted-foreground">
            {format(currentWeekStart, "yyyy")}
          </div>
        </div>

        <TouchButton
          onClick={handleNextWeek}
          variant="secondary"
          size="md"
          className="flex items-center gap-2"
        >
          Semana Siguiente
          <ChevronRight className="w-5 h-5" />
        </TouchButton>
      </div>

      {/* Calendar Grid */}
      <div
        ref={calendarRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="overflow-x-auto"
      >
        <div className="inline-block min-w-full">
          {/* Day Headers */}
          <div className="grid grid-cols-8 gap-2 mb-2">
            <div className="font-semibold text-center py-2 text-muted-foreground">
              Hora
            </div>
            {daysOfWeek.map((day) => (
              <div
                key={day.toISOString()}
                className="font-semibold text-center py-2 border-b-2 border-border"
              >
                <div>{format(day, "EEE", { locale: es })}</div>
                <div className="text-sm text-muted-foreground">
                  {format(day, "d")}
                </div>
              </div>
            ))}
          </div>

          {/* Hour Rows */}
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} className="grid grid-cols-8 gap-2 mb-2">
              {/* Hour Label */}
              <div className="flex items-center justify-center font-semibold text-muted-foreground bg-muted/30 rounded-lg py-3">
                {hour.toString().padStart(2, "0")}:00
              </div>

              {/* Day Cells */}
              {daysOfWeek.map((day) => {
                const cellSchedules = getSchedulesForCell(hour, day);
                const isToday = isSameDay(day, new Date());
                const isPast = day < new Date() && !isToday;

                return (
                  <div
                    key={`${hour}-${day.toISOString()}`}
                    className={`min-h-[80px] p-2 rounded-lg border-2 transition-all ${
                      isToday
                        ? "bg-primary/10 border-primary"
                        : isPast
                        ? "bg-muted/30 border-border opacity-60"
                        : "bg-background border-border hover:border-primary/50"
                    } ${
                      cellSchedules.length > 0
                        ? "cursor-pointer active:scale-95"
                        : "cursor-default"
                    }`}
                    onClick={() => {
                      if (cellSchedules.length > 0) {
                        setSelectedCell({ hour, date: day });
                      }
                    }}
                  >
                    {cellSchedules.length > 0 ? (
                      <div className="space-y-1">
                        {cellSchedules.slice(0, 2).map((schedule) => (
                          <div
                            key={schedule.id}
                            className={`text-xs p-1 rounded ${
                              selectedScheduleId === schedule.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-card border border-border"
                            }`}
                          >
                            <div className="font-semibold truncate">
                              {schedule.routeName}
                            </div>
                            {schedule.minPrice !== undefined && schedule.maxPrice !== undefined ? (
                              <div className="text-[10px] font-bold text-primary">
                                {schedule.minPrice === schedule.maxPrice
                                  ? `$${schedule.minPrice.toFixed(2)}`
                                  : `$${schedule.minPrice.toFixed(2)} - $${schedule.maxPrice.toFixed(2)}`}
                              </div>
                            ) : (
                              <div className="text-[10px] font-bold text-primary">
                                ${schedule.price.toFixed(2)}
                              </div>
                            )}
                            {schedule.isExpress && (
                              <Badge
                                variant="default"
                                className="text-[8px] px-1 py-0 bg-warning text-warning-foreground mt-0.5"
                              >
                                Exp
                              </Badge>
                            )}
                          </div>
                        ))}
                        {cellSchedules.length > 2 && (
                          <div className="text-[10px] text-center text-muted-foreground font-semibold">
                            +{cellSchedules.length - 2} más
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground text-center pt-2">
                        -
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Detail Modal */}
      {selectedCell && selectedCellSchedules.length > 0 && (
        <ScheduleDetailModal
          schedules={selectedCellSchedules}
          hour={selectedCell.hour}
          date={selectedCell.date}
          onClose={() => setSelectedCell(null)}
          onSelect={onSelectSchedule}
        />
      )}
    </div>
  );
}

