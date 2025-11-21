"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

interface Trip {
  id: string;
  busId: string;
  routeId: string;
  departureTime: string;
  arrivalEstimate: string | null;
  status: string;
  price: number;
  bus?: {
    plateNumber: string;
    unitNumber: string | null;
  };
  route?: {
    origin: string;
    destination: string;
  };
}

interface Bus {
  id: string;
  plateNumber: string;
  unitNumber: string | null;
}

export default function OwnerCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedBus, setSelectedBus] = useState<string | null>(null);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuses();
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [currentMonth, selectedBus]);

  const fetchBuses = async () => {
    try {
      const response = await fetch("/api/admin/buses");
      const data = await response.json();
      if (response.ok) {
        setBuses(data.buses || []);
      }
    } catch (error) {
      console.error("Error fetching buses:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrips = async () => {
    try {
      const response = await fetch("/api/admin/trips");
      const data = await response.json();
      if (response.ok) {
        let filteredTrips = data.trips || [];
        
        // Filter by selected bus if any
        if (selectedBus) {
          filteredTrips = filteredTrips.filter((t: Trip) => t.busId === selectedBus);
        }

        // Filter by current month
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        filteredTrips = filteredTrips.filter((t: Trip) => {
          const tripDate = new Date(t.departureTime);
          return tripDate >= start && tripDate <= end;
        });

        setTrips(filteredTrips);
      }
    } catch (error) {
      console.error("Error fetching trips:", error);
    }
  };

  const getTripsForDate = (date: Date): Trip[] => {
    return trips.filter((trip) => isSameDay(new Date(trip.departureTime), date));
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Calendario de Unidades</h1>
          <div className="flex gap-4 items-center">
            <select
              value={selectedBus || ""}
              onChange={(e) => setSelectedBus(e.target.value || null)}
              className="px-4 py-2 bg-card border border-input rounded-lg"
            >
              <option value="">Todos los buses</option>
              {buses.map((bus) => (
                <option key={bus.id} value={bus.id}>
                  {bus.plateNumber} {bus.unitNumber && `(${bus.unitNumber})`}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={previousMonth}
                className="px-4 py-2 bg-card border border-input rounded-lg hover:bg-muted"
              >
                ←
              </button>
              <span className="px-4 py-2 font-semibold">
                {format(currentMonth, "MMMM yyyy", { locale: es })}
              </span>
              <button
                onClick={nextMonth}
                className="px-4 py-2 bg-card border border-input rounded-lg hover:bg-muted"
              >
                →
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
              <div key={day} className="text-center font-semibold text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {daysInMonth.map((day) => {
              const dayTrips = getTripsForDate(day);
              const isToday = isSameDay(day, new Date());
              const isPast = day < new Date() && !isToday;

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[120px] p-2 border rounded-lg ${
                    isToday
                      ? "bg-primary/10 border-primary"
                      : isPast
                      ? "bg-muted/30 border-border"
                      : "bg-background border-border"
                  }`}
                >
                  <div className="text-sm font-semibold mb-2">
                    {format(day, "d")}
                  </div>
                  <div className="space-y-1">
                    {dayTrips.slice(0, 3).map((trip) => (
                      <div
                        key={trip.id}
                        className="text-xs p-1 bg-primary/20 rounded truncate"
                        title={`${trip.bus?.plateNumber || ""} - ${format(
                          new Date(trip.departureTime),
                          "HH:mm"
                        )} - ${trip.route?.origin || ""} → ${trip.route?.destination || ""}`}
                      >
                        {format(new Date(trip.departureTime), "HH:mm")} -{" "}
                        {trip.bus?.plateNumber || ""}
                      </div>
                    ))}
                    {dayTrips.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayTrips.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trip Details */}
        <div className="mt-8 bg-card border border-border rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Viajes del Mes</h2>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {trips.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay viajes programados para este mes
              </p>
            ) : (
              trips.map((trip) => (
                <div
                  key={trip.id}
                  className="p-4 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">
                        {format(new Date(trip.departureTime), "PPP 'a las' HH:mm", { locale: es })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {trip.bus?.plateNumber} {trip.bus?.unitNumber && `(${trip.bus.unitNumber})`}
                      </p>
                      <p className="text-sm">
                        {trip.route?.origin} → {trip.route?.destination}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${trip.price.toFixed(2)}</p>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          trip.status === "completed"
                            ? "bg-success/20 text-success"
                            : trip.status === "in_transit"
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {trip.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

