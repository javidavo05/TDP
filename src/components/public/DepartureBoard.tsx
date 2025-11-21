"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Departure {
  id: string;
  hour: number;
  isExpress: boolean;
  busPlateNumber: string;
  busUnitNumber: string | null;
  routeOrigin: string;
  routeDestination: string;
  status: "scheduled" | "boarding" | "departed" | "delayed";
}

interface DepartureBoardProps {
  className?: string;
}

export function DepartureBoard({ className = "" }: DepartureBoardProps) {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchDepartures();
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      fetchDepartures();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchDepartures = async () => {
    try {
      const response = await fetch("/api/public/departures");
      const data = await response.json();
      if (response.ok) {
        setDepartures(data.departures || []);
      }
    } catch (error) {
      console.error("Error fetching departures:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "boarding":
        return "text-yellow-400";
      case "departed":
        return "text-gray-500";
      case "delayed":
        return "text-red-400";
      default:
        return "text-green-400";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "boarding":
        return "EMBARQUE";
      case "departed":
        return "SALIÓ";
      case "delayed":
        return "RETRASADO";
      default:
        return "PROGRAMADO";
    }
  };

  // Filter departures for next 4 hours
  const upcomingDepartures = departures
    .filter((dep) => {
      const depTime = new Date();
      depTime.setHours(dep.hour, 0, 0, 0);
      const hoursUntil = (depTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
      return hoursUntil >= 0 && hoursUntil <= 4;
    })
    .sort((a, b) => a.hour - b.hour)
    .slice(0, 20); // Show max 20 departures

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen bg-black text-white ${className}`}>
        <div className="text-4xl">Cargando salidas...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-black text-white ${className}`}>
      {/* Header */}
      <div className="bg-gray-900 border-b-4 border-blue-500 p-8">
        <div className="container mx-auto">
          <h1 className="text-6xl font-bold mb-2">SALIDAS</h1>
          <div className="flex items-center justify-between">
            <p className="text-3xl text-gray-300">
              {format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
            <p className="text-4xl font-mono">
              {format(currentTime, "HH:mm:ss")}
            </p>
          </div>
        </div>
      </div>

      {/* Departures List */}
      <div className="container mx-auto p-8">
        {upcomingDepartures.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-4xl text-gray-400">No hay salidas programadas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingDepartures.map((departure) => {
              const depTime = new Date();
              depTime.setHours(departure.hour, 0, 0, 0);
              const timeStr = format(depTime, "HH:mm");

              return (
                <div
                  key={departure.id}
                  className="bg-gray-900 border-l-8 border-blue-500 p-6 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Time */}
                    <div className="col-span-2">
                      <div className="text-5xl font-mono font-bold text-blue-400">
                        {timeStr}
                      </div>
                    </div>

                    {/* Route */}
                    <div className="col-span-4">
                      <div className="text-3xl font-semibold">
                        {departure.routeOrigin} → {departure.routeDestination}
                      </div>
                    </div>

                    {/* Bus Info */}
                    <div className="col-span-3">
                      <div className="text-2xl font-medium text-gray-300">
                        Bus: {departure.busPlateNumber}
                        {departure.busUnitNumber && ` (${departure.busUnitNumber})`}
                      </div>
                    </div>

                    {/* Service Type */}
                    <div className="col-span-2">
                      {departure.isExpress ? (
                        <span className="inline-block px-4 py-2 bg-orange-500 text-white text-xl font-bold rounded">
                          EXPRESO
                        </span>
                      ) : (
                        <span className="inline-block px-4 py-2 bg-blue-500 text-white text-xl font-bold rounded">
                          NORMAL
                        </span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="col-span-1 text-right">
                      <div className={`text-2xl font-bold ${getStatusColor(departure.status)}`}>
                        {getStatusText(departure.status)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

