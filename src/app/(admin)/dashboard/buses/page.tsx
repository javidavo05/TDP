"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function BusesManagementPage() {
  const [buses, setBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuses();
  }, []);

  const fetchBuses = async () => {
    // Placeholder - would fetch from API
    setBuses([]);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Gestión de Buses</h1>
          <Link
            href="/dashboard/buses/new"
            className="px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Nuevo Bus
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8">Cargando...</div>
        ) : buses.length === 0 ? (
          <div className="bg-card p-8 rounded-lg shadow-md text-center">
            <p className="text-muted-foreground mb-4">No hay buses registrados</p>
            <Link
              href="/dashboard/buses/new"
              className="text-primary hover:underline"
            >
              Crear primer bus
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {buses.map((bus) => (
              <div key={bus.id} className="bg-card p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-2">{bus.plateNumber}</h3>
                <p className="text-sm text-muted-foreground mb-4">{bus.model}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Capacidad: {bus.capacity}</span>
                  <Link
                    href={`/dashboard/buses/${bus.id}`}
                    className="text-primary hover:underline text-sm"
                  >
                    Ver detalles
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

