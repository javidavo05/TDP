"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalTickets: 0,
    totalRevenue: 0,
    activeBuses: 0,
  });

  useEffect(() => {
    // Fetch stats from API
    fetchStats();
  }, []);

  const fetchStats = async () => {
    // Placeholder - would fetch from API
    setStats({
      totalTrips: 150,
      totalTickets: 1250,
      totalRevenue: 45000,
      activeBuses: 25,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard Administrativo</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card p-6 rounded-lg shadow-md">
            <h3 className="text-sm text-muted-foreground mb-2">Total Viajes</h3>
            <p className="text-3xl font-bold">{stats.totalTrips}</p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-md">
            <h3 className="text-sm text-muted-foreground mb-2">Total Tickets</h3>
            <p className="text-3xl font-bold">{stats.totalTickets}</p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-md">
            <h3 className="text-sm text-muted-foreground mb-2">Revenue Total</h3>
            <p className="text-3xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-md">
            <h3 className="text-sm text-muted-foreground mb-2">Buses Activos</h3>
            <p className="text-3xl font-bold">{stats.activeBuses}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Accesos Rápidos</h2>
            <div className="space-y-2">
              <Link
                href="/dashboard/buses"
                className="block p-3 border rounded hover:bg-muted transition"
              >
                Gestión de Buses
              </Link>
              <Link
                href="/dashboard/routes"
                className="block p-3 border rounded hover:bg-muted transition"
              >
                Gestión de Rutas
              </Link>
              <Link
                href="/dashboard/trips"
                className="block p-3 border rounded hover:bg-muted transition"
              >
                Gestión de Viajes
              </Link>
              <Link
                href="/dashboard/analytics"
                className="block p-3 border rounded hover:bg-muted transition"
              >
                Analytics y Reportes
              </Link>
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Actividad Reciente</h2>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">No hay actividad reciente</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

