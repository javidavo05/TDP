"use client";

import { useEffect, useState } from "react";

export default function DriverMobilePage() {
  const [tracking, setTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState<any>(null);
  const [position, setPosition] = useState<GeolocationPosition | null>(null);

  useEffect(() => {
    if (tracking && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setPosition(pos);
          if (currentTrip) {
            sendGPSUpdate(currentTrip.id, currentTrip.busId, pos);
          }
        },
        (error) => {
          console.error("GPS error:", error);
        },
        { enableHighAccuracy: true }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [tracking, currentTrip]);

  const sendGPSUpdate = async (tripId: string, busId: string, pos: GeolocationPosition) => {
    try {
      await fetch("/api/gps/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          busId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          speed: pos.coords.speed || null,
          heading: pos.coords.heading || null,
        }),
      });
    } catch (error) {
      console.error("Error sending GPS update:", error);
    }
  };

  const startTracking = () => {
    setTracking(true);
    // In a real app, this would fetch the current trip
    setCurrentTrip({ id: "trip-1", busId: "bus-1" });
  };

  const stopTracking = () => {
    setTracking(false);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <h1 className="text-2xl font-bold mb-6">Driver Dashboard</h1>

      <div className="bg-card p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">GPS Tracking</h2>
        {position && (
          <div className="space-y-2 mb-4">
            <p className="text-sm">
              <strong>Lat:</strong> {position.coords.latitude.toFixed(6)}
            </p>
            <p className="text-sm">
              <strong>Lng:</strong> {position.coords.longitude.toFixed(6)}
            </p>
            {position.coords.speed && (
              <p className="text-sm">
                <strong>Velocidad:</strong> {(position.coords.speed * 3.6).toFixed(2)} km/h
              </p>
            )}
          </div>
        )}
        <div className="flex gap-4">
          {!tracking ? (
            <button
              onClick={startTracking}
              className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Iniciar Tracking
            </button>
          ) : (
            <button
              onClick={stopTracking}
              className="flex-1 px-6 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90"
            >
              Detener Tracking
            </button>
          )}
        </div>
      </div>

      <div className="bg-card p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Manifest de Pasajeros</h2>
        <p className="text-muted-foreground">Lista de pasajeros del viaje actual</p>
      </div>
    </div>
  );
}

